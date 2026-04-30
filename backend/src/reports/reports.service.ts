import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";
import { Broker } from "../brokers/broker.entity";

type SourceFilter = "leads" | "officernd" | "all";

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Deal) private dealsRepo: Repository<Deal>,
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Broker) private brokersRepo: Repository<Broker>,
  ) {}

  async getWinLossReport(userId?: string, userRole?: string, source: SourceFilter = "all") {
    const users = await this.usersRepo.find();
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

    const qb = this.dealsRepo.createQueryBuilder("deal").leftJoinAndSelect("deal.owner", "owner");
    if (userRole === "SALES" && userId) qb.andWhere("deal.owner_id = :uid", { uid: userId });
    if (source === "leads") qb.andWhere("deal.officernd_sync_id IS NULL");
    else if (source === "officernd") qb.andWhere("deal.officernd_sync_id IS NOT NULL");
    const allDeals = await qb.getMany();

    const report = new Map<string, { userName: string; won: number; lost: number; wonValue: number; lostValue: number }>();

    for (const deal of allDeals) {
      const key = deal.owner.id;
      if (!report.has(key)) {
        report.set(key, { userName: userMap.get(key) || "Unknown", won: 0, lost: 0, wonValue: 0, lostValue: 0 });
      }
      const entry = report.get(key)!;
      if (deal.status === "won") {
        entry.won += 1;
        entry.wonValue += Number(deal.value) || 0;
      } else if (deal.status === "lost" || deal.isLost) {
        entry.lost += 1;
        entry.lostValue += Number(deal.value) || 0;
      }
    }

    return Array.from(report.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      won: data.won,
      lost: data.lost,
      winRate: data.won + data.lost > 0 ? Math.round((data.won / (data.won + data.lost)) * 1000) / 10 : 0,
      wonValue: data.wonValue,
      lostValue: data.lostValue,
      totalValue: data.wonValue + data.lostValue,
    }));
  }

  async getDealPipeline(userId?: string, userRole?: string) {
    const where: any = { isLost: false };
    if (userRole === "SALES" && userId) {
      where.owner = { id: userId };
    }
    const deals = await this.dealsRepo.find({
      where,
      relations: ["client", "broker", "owner"],
      order: { stage: "ASC" },
    });

    const byStage = new Map<string, any[]>();
    for (const deal of deals) {
      if (!byStage.has(deal.stage)) {
        byStage.set(deal.stage, []);
      }
      byStage.get(deal.stage)!.push(deal);
    }

    return Array.from(byStage.entries()).map(([stage, stageDeals]) => ({
      stage,
      count: stageDeals.length,
      totalValue: stageDeals.reduce((sum, d) => sum + Number(d.value), 0),
      deals: stageDeals.map((d) => ({
        id: d.id,
        title: d.title,
        value: Number(d.value),
        clientName: d.client?.name || "Unknown",
        ownerName: d.owner?.name || "Unknown",
        brokerName: (d as any).broker?.name || null,
        location: (d as any).location || null,
        spaceType: (d as any).spaceType || null,
      })),
    }));
  }

  async getBrokerPerformance(month?: string, userId?: string, userRole?: string) {
    const brokers = await this.brokersRepo.find();
    const brokerMap = new Map(brokers.map((b) => [b.id, b.name]));

    let dateFilter: any = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      dateFilter = { createdAt: Between(start, end) };
    }

    const findOptions: any = {
      where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      relations: ["broker"],
    };

    if (userRole === "SALES" && userId) {
      const existingWhere = findOptions.where || {};
      findOptions.where = { ...existingWhere, owner: { id: userId } };
    }

    const deals = await this.dealsRepo.find(findOptions);

    const byBroker = new Map<string, { totalDeals: number; won: number; lost: number; active: number; totalValue: number; totalCommission: number }>();

    for (const deal of deals) {
      if (!deal.broker) continue;
      const key = deal.broker.id;
      if (!byBroker.has(key)) {
        byBroker.set(key, { totalDeals: 0, won: 0, lost: 0, active: 0, totalValue: 0, totalCommission: 0 });
      }
      const entry = byBroker.get(key)!;
      entry.totalDeals += 1;
      entry.totalValue += Number(deal.value) || 0;
      entry.totalCommission += Number(deal.commissionAmount) || 0;

      if (deal.status === "won") entry.won += 1;
      else if (deal.status === "lost" || deal.isLost) entry.lost += 1;
      else entry.active += 1;
    }

    return Array.from(byBroker.entries()).map(([brokerId, data]) => ({
      brokerId,
      brokerName: brokerMap.get(brokerId) || "Unknown",
      totalDeals: data.totalDeals,
      won: data.won,
      lost: data.lost,
      active: data.active,
      winRate: data.won + data.lost > 0 ? Math.round((data.won / (data.won + data.lost)) * 1000) / 10 : 0,
      totalValue: data.totalValue,
      totalCommission: data.totalCommission,
    }));
  }

  async getStaffPerformance(month?: string, source: SourceFilter = "all") {
    const users = await this.usersRepo.find();
    const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

    const qb = this.dealsRepo.createQueryBuilder("deal").leftJoinAndSelect("deal.owner", "owner");
    if (month) {
      const [year, m] = month.split("-").map(Number);
      qb.andWhere("deal.created_at >= :start AND deal.created_at < :end", {
        start: new Date(year, m - 1, 1),
        end: new Date(year, m, 1),
      });
    }
    if (source === "leads") qb.andWhere("deal.officernd_sync_id IS NULL");
    else if (source === "officernd") qb.andWhere("deal.officernd_sync_id IS NOT NULL");
    const deals = await qb.getMany();

    const byOwner = new Map<string, { totalAssigned: number; won: number; lost: number; active: number; wonValue: number; lostValue: number; activeValue: number; totalCommission: number }>();

    for (const deal of deals) {
      const key = deal.owner.id;
      if (!byOwner.has(key)) {
        byOwner.set(key, { totalAssigned: 0, won: 0, lost: 0, active: 0, wonValue: 0, lostValue: 0, activeValue: 0, totalCommission: 0 });
      }
      const entry = byOwner.get(key)!;
      entry.totalAssigned += 1;

      if (deal.status === "won") {
        entry.won += 1;
        entry.wonValue += Number(deal.value) || 0;
        entry.totalCommission += Number(deal.commissionAmount) || 0;
      } else if (deal.status === "lost" || deal.isLost) {
        entry.lost += 1;
        entry.lostValue += Number(deal.value) || 0;
      } else {
        entry.active += 1;
        entry.activeValue += Number(deal.value) || 0;
      }
    }

    return Array.from(byOwner.entries()).map(([userId, data]) => ({
      userId,
      userName: userMap.get(userId) || "Unknown",
      totalAssigned: data.totalAssigned,
      won: data.won,
      lost: data.lost,
      active: data.active,
      wonValue: data.wonValue,
      lostValue: data.lostValue,
      activeValue: data.activeValue,
      winRate: data.won + data.lost > 0 ? Math.round((data.won / (data.won + data.lost)) * 1000) / 10 : 0,
      totalRevenue: data.wonValue + data.lostValue + data.activeValue,
      totalCommission: data.totalCommission,
    }));
  }

  async getSpaceTypeBreakdown(month?: string, userId?: string, userRole?: string) {
    let dateFilter: any = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      dateFilter = { createdAt: Between(start, end) };
    }

    const findOptions: any = {
      where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
    };

    if (userRole === "SALES" && userId) {
      const existingWhere = findOptions.where || {};
      findOptions.where = { ...existingWhere, owner: { id: userId } };
    }

    const deals = await this.dealsRepo.find(findOptions);

    const bySpace = new Map<string, { count: number; totalValue: number; won: number; lost: number }>();
    for (const deal of deals) {
      const spaceType = (deal as any).spaceType || "UNKNOWN";
      if (!bySpace.has(spaceType)) {
        bySpace.set(spaceType, { count: 0, totalValue: 0, won: 0, lost: 0 });
      }
      const entry = bySpace.get(spaceType)!;
      entry.count += 1;
      entry.totalValue += Number(deal.value) || 0;
      if (deal.status === "won") entry.won += 1;
      else if (deal.status === "lost" || deal.isLost) entry.lost += 1;
    }

    return Array.from(bySpace.entries()).map(([spaceType, data]) => ({
      spaceType,
      count: data.count,
      totalValue: data.totalValue,
      won: data.won,
      lost: data.lost,
    }));
  }
}
