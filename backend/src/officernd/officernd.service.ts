import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { OfficerndSync } from "./entities/officernd-sync.entity";
import { OfficerndSyncRun } from "./entities/officernd-sync-run.entity";
import { Deal } from "../deals/deal.entity";
import { Client } from "../clients/client.entity";
import { User } from "../users/user.entity";
import { QueryOfficerndSyncDto, QuerySyncRunsDto } from "./dto";
import { Cron } from "@nestjs/schedule";

@Injectable()
export class OfficerndService {
  private readonly logger = new Logger(OfficerndService.name);
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private syncLock = false;

  constructor(
    @InjectRepository(OfficerndSync) private syncRepo: Repository<OfficerndSync>,
    @InjectRepository(OfficerndSyncRun) private syncRunRepo: Repository<OfficerndSyncRun>,
    @InjectRepository(Deal) private dealRepo: Repository<Deal>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private httpService: HttpService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  private get orgSlug() {
    return this.configService.get("OFFICERND_ORG_SLUG");
  }

  private get apiBase() {
    return `https://app.officernd.com/api/v2/organizations/${this.orgSlug}`;
  }

  // ---------------------------------------------------------------------------
  // OAuth
  // ---------------------------------------------------------------------------

  /** Authenticate with OfficeRnD and cache the access token. */
  private async authenticate(): Promise<void> {
    const clientId = this.configService.get("OFFICERND_CLIENT_ID");
    const clientSecret = this.configService.get("OFFICERND_CLIENT_SECRET");
    const grantType = this.configService.get("OFFICERND_GRANT_TYPE", "client_credentials");
    const scope = this.configService.get("OFFICERND_SCOPE");

    const body = new URLSearchParams({
      grant_type: grantType,
      client_id: clientId,
      client_secret: clientSecret,
      ...(scope ? { scope } : {}),
    });

    const response = await firstValueFrom(
      this.httpService.post("https://identity.officernd.com/oauth/token", body.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    const data = response.data;
    this.accessToken = data.access_token;
    this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000);
  }

  /** Return a valid access token, refreshing if necessary. */
  private async getValidToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }
    await this.authenticate();
    return this.accessToken!;
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  /**
   * Fetch all memberships from OfficeRnD, paginating with cursorNext.
   * Returns the raw membership objects from the API.
   */
  private async fetchMemberships(token: string): Promise<any[]> {
    const all: any[] = [];
    let url: string | null = `${this.apiBase}/billing/memberships?$limit=50`;

    while (url) {
      const response: any = await firstValueFrom(
        this.httpService.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );

      const results: any[] = response.data?.results ?? [];
      const cursorNext: string | null = response.data?.cursorNext ?? null;
      if (!results || results.length === 0) break;

      all.push(...results);

      if (!cursorNext) break;
      // cursorNext may be a relative path or already contain query params
      url = cursorNext.startsWith("http")
        ? cursorNext
        : `${this.apiBase}/billing/memberships?$limit=50&$cursorNext=${cursorNext}`;
    }

    return all;
  }

  /**
   * Main sync entrypoint. Fetches memberships from OfficeRnD and upserts
   * those whose endDate falls within the next 90 days (Asia/Qatar timezone).
   */
  async syncMemberships(trigger: "CRON" | "MANUAL"): Promise<void> {
    if (this.syncLock) {
      this.logger.warn("Sync already in progress — skipping");
      return;
    }
    this.syncLock = true;

    const run = this.syncRunRepo.create({
      status: "RUNNING",
      trigger,
      startedAt: new Date(),
    });
    await this.syncRunRepo.save(run);

    try {
      // Authenticate
      try {
        await this.authenticate();
      } catch (err: any) {
        run.status = "FAILED";
        run.errorMessage = err?.message ?? "Authentication failed";
        run.finishedAt = new Date();
        await this.syncRunRepo.save(run);
        return;
      }

      const token = this.accessToken!;

      // Fetch all memberships
      const memberships = await this.fetchMemberships(token);

      // Determine the 90-day window in Asia/Qatar timezone
      const now = new Date();
      const qatarOffset = 3 * 60; // UTC+3
      const nowQatar = new Date(now.getTime() + qatarOffset * 60 * 1000);
      const todayStart = new Date(
        Date.UTC(nowQatar.getUTCFullYear(), nowQatar.getUTCMonth(), nowQatar.getUTCDate(), 0, 0, 0, 0),
      );
      const ninetyDays = new Date(todayStart.getTime() + 90 * 24 * 60 * 60 * 1000);

      let processed = 0;
      let created = 0;
      let updated = 0;

      for (const m of memberships) {
        const endDateRaw = m.endDate || m.end_date;
        if (!endDateRaw) continue;

        const endDate = new Date(endDateRaw);
        if (endDate < todayStart || endDate > ninetyDays) continue;

        const result = await this.upsertMembership(m);
        processed++;
        if (result.created) created++;
        else if (result.updated) updated++;
      }

      run.status = "SUCCESS";
      run.recordsProcessed = processed;
      run.recordsCreated = created;
      run.recordsUpdated = updated;
      run.finishedAt = new Date();
      await this.syncRunRepo.save(run);
    } catch (err: any) {
      run.status = "FAILED";
      run.errorMessage = err?.message ?? "Unknown error";
      run.finishedAt = new Date();
      await this.syncRunRepo.save(run);
    } finally {
      this.syncLock = false;
    }
  }

  /**
   * Upsert a single membership into the officernd_sync table.
   * - New rows are created with status PENDING.
   * - Existing PENDING rows are freely overwritten from upstream data.
   * - Existing non-PENDING rows record upstream changes without overwriting typed columns.
   */
  private async upsertMembership(membership: any): Promise<{ created: boolean; updated: boolean }> {
    const membershipId = membership.id || membership._id;
    const officerndCompanyId = membership.company || membership.companyId || "";
    const companyName =
      membership.companyName ||
      membership.company?.name ||
      membership.companyName ||
      "Unknown Company";
    const contactEmail = membership.contactEmail || membership.member?.email || null;
    const contactPhone = membership.contactPhone || membership.member?.phone || null;
    const membershipType =
      membership.plan?.name || membership.membershipType || membership.resourceName || null;
    const membershipValue = membership.price ?? membership.value ?? null;
    const endDate = membership.endDate || membership.end_date;
    const officerndData = membership;

    const existing = await this.syncRepo.findOne({ where: { membershipId } });

    if (!existing) {
      const row = this.syncRepo.create({
        membershipId,
        officerndCompanyId,
        companyName,
        contactEmail,
        contactPhone,
        membershipType,
        membershipValue,
        endDate: new Date(endDate),
        officerndData,
        status: "PENDING",
        syncedAt: new Date(),
      });
      await this.syncRepo.save(row);
      return { created: true, updated: false };
    }

    if (existing.status === "PENDING") {
      // Free overwrite for PENDING rows
      existing.officerndCompanyId = officerndCompanyId;
      existing.companyName = companyName;
      existing.contactEmail = contactEmail;
      existing.contactPhone = contactPhone;
      existing.membershipType = membershipType;
      existing.membershipValue = membershipValue;
      existing.endDate = new Date(endDate);
      existing.officerndData = officerndData;
      existing.syncedAt = new Date();
      await this.syncRepo.save(existing);
      return { created: false, updated: true };
    }

    // Non-PENDING: detect upstream changes without overwriting typed columns
    const fieldsToCompare: Array<{ key: keyof OfficerndSync; incoming: any }> = [
      { key: "companyName", incoming: companyName },
      { key: "contactEmail", incoming: contactEmail },
      { key: "contactPhone", incoming: contactPhone },
      { key: "membershipType", incoming: membershipType },
      { key: "membershipValue", incoming: membershipValue },
      { key: "endDate", incoming: endDate ? new Date(endDate).toISOString() : null },
    ];

    const changes: Record<string, { old: any; new: any }> = {};
    for (const { key, incoming } of fieldsToCompare) {
      const current = existing[key];
      const currentVal = current instanceof Date ? current.toISOString() : current;
      if (JSON.stringify(currentVal) !== JSON.stringify(incoming)) {
        changes[key as string] = { old: currentVal, new: incoming };
      }
    }

    if (Object.keys(changes).length > 0) {
      existing.upstreamChangedAt = new Date();
      existing.upstreamChanges = changes;
    }

    // Always update raw data and synced timestamp
    existing.officerndData = officerndData;
    existing.syncedAt = new Date();
    await this.syncRepo.save(existing);

    return { created: false, updated: Object.keys(changes).length > 0 };
  }

  // ---------------------------------------------------------------------------
  // Query Methods
  // ---------------------------------------------------------------------------

  async getSyncStatus(): Promise<{ lastSync: Date | null; counts: Record<string, number> }> {
    const lastRun = await this.syncRunRepo.findOne({
      where: { status: "SUCCESS" },
      order: { startedAt: "DESC" },
    });
    const rows = await this.syncRepo.find({ select: ["status"] });
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }
    return { lastSync: lastRun?.startedAt ?? null, counts };
  }

  async getExpiringCompanies(query: QueryOfficerndSyncDto) {
    const { page = 1, limit = 20, status, search } = query;
    const qb = this.syncRepo
      .createQueryBuilder("s")
      .leftJoinAndSelect("s.assignedUser", "u")
      .leftJoinAndSelect("s.client", "c")
      .leftJoinAndSelect("s.deal", "d");

    if (status) {
      qb.andWhere("s.status = :status", { status });
    }
    if (search) {
      qb.andWhere(
        "(s.company_name ILIKE :search OR s.contact_email ILIKE :search OR s.contact_phone ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    const total = await qb.getCount();
    const data = await qb
      .orderBy("s.end_date", "ASC")
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total, page, limit };
  }

  async getSyncRuns(query: QuerySyncRunsDto) {
    const { page = 1, limit = 10 } = query;
    const [data, total] = await this.syncRunRepo.findAndCount({
      order: { startedAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit };
  }

  async findSalesReps(): Promise<User[]> {
    return this.userRepo.find({ where: { role: "SALES", isActive: true } });
  }

  // ---------------------------------------------------------------------------
  // Action Methods
  // ---------------------------------------------------------------------------

  async assignSalesRep(id: string, userId: string): Promise<OfficerndSync> {
    const sync = await this.syncRepo.findOne({ where: { id } });
    if (!sync) throw new NotFoundException();
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException("User not found");
    sync.assignedTo = userId;
    sync.status = "ASSIGNED";
    return this.syncRepo.save(sync);
  }

  async unassign(id: string): Promise<OfficerndSync> {
    const sync = await this.syncRepo.findOne({ where: { id } });
    if (!sync) throw new NotFoundException();
    sync.assignedTo = null;
    sync.status = "PENDING";
    return this.syncRepo.save(sync);
  }

  async bulkAssign(ids: string[], userId: string): Promise<void> {
    await this.syncRepo.update(ids, { assignedTo: userId, status: "ASSIGNED" });
  }

  async sendToPipeline(id: string): Promise<{ sync: OfficerndSync; deal: Deal }> {
    return this.dataSource.transaction(async (manager) => {
      const sync = await manager.findOne(OfficerndSync, { where: { id } });
      if (!sync) throw new NotFoundException();
      if (sync.status !== "ASSIGNED")
        throw new BadRequestException("Must be ASSIGNED before sending to pipeline");

      let clientId = sync.clientId;

      // Auto-create client if needed
      if (!clientId) {
        // Dedup by email or phone
        const existingClient = await manager.findOne(Client, {
          where: [
            ...(sync.contactEmail ? [{ email: sync.contactEmail }] : []),
            ...(sync.contactPhone ? [{ phone: sync.contactPhone }] : []),
          ],
        });

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const client = manager.create(Client, {
            name: sync.companyName,
            email: sync.contactEmail || `${sync.officerndCompanyId}@officernd.placeholder`,
            phone: sync.contactPhone || "",
            source: "OFFICERND_RENEWAL",
          });
          const saved = await manager.save(client);
          clientId = saved.id;
        }
      }

      // Create deal
      const deal = manager.create(Deal, {
        title: `${sync.companyName} — Renewal`,
        value: sync.membershipValue ?? 0,
        stage: "NEW",
        status: "active",
        ownerId: sync.assignedTo!,
        clientId,
        officerndSyncId: id,
        location: "BARWA_ALSADD",
        spaceType: "CLOSED_OFFICE",
        stageHistory: ["NEW"],
      });
      const savedDeal = await manager.save(deal);

      // Update sync row
      sync.clientId = clientId;
      sync.dealId = savedDeal.id;
      sync.status = "PIPELINED";
      await manager.save(sync);

      return { sync, deal: savedDeal };
    });
  }

  async bulkSendToPipeline(ids: string[]): Promise<void> {
    for (const id of ids) {
      await this.sendToPipeline(id);
    }
  }

  async ignore(id: string): Promise<OfficerndSync> {
    const sync = await this.syncRepo.findOne({ where: { id } });
    if (!sync) throw new NotFoundException();
    sync.status = "IGNORED";
    return this.syncRepo.save(sync);
  }

  async unignore(id: string): Promise<OfficerndSync> {
    const sync = await this.syncRepo.findOne({ where: { id } });
    if (!sync) throw new NotFoundException();
    sync.status = "PENDING";
    return this.syncRepo.save(sync);
  }

  async acknowledgeUpstreamChange(id: string): Promise<OfficerndSync> {
    const sync = await this.syncRepo.findOne({ where: { id } });
    if (!sync) throw new NotFoundException();
    if (sync.upstreamChanges) {
      for (const [field, change] of Object.entries(sync.upstreamChanges)) {
        (sync as any)[field] = change.new;
      }
    }
    sync.upstreamChanges = null;
    sync.upstreamChangedAt = null;
    return this.syncRepo.save(sync);
  }

  // ---------------------------------------------------------------------------
  // Cron
  // ---------------------------------------------------------------------------

  @Cron("7,37 * * * *", { timeZone: "Asia/Qatar" })
  async handleCronSync() {
    this.logger.log("Starting scheduled OfficeRnD sync");
    await this.syncMemberships("CRON");
  }
}
