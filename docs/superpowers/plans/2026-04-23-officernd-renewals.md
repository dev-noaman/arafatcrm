# OfficeRnD Renewals Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate OfficeRnD API to sync expiring memberships, let admins assign sales reps, and push renewals into the deal pipeline as new deals.

**Architecture:** New `OfficerndModule` in backend with scheduled sync (cron every 30 min). New `OfficerndSync` + `OfficerndSyncRun` entities. Frontend gets a new admin-only page with triage table and bulk actions. Pipeline cards get distinct styling for OfficeRnD deals.

**Tech Stack:** NestJS, TypeORM, `@nestjs/schedule`, `@nestjs/axios`, React, TanStack Query

**Spec:** `docs/superpowers/specs/2026-04-23-officernd-renewals-design.md`

**Note:** `whitelist: true` and `forbidNonWhitelisted: true` are already applied globally via `ValidationPipe` in `main.ts` — no need to add per-DTO.

---

## File Structure

### Backend — New Files
```
backend/src/officernd/
├── officernd.module.ts
├── officernd.controller.ts
├── officernd.service.ts
├── entities/
│   ├── officernd-sync.entity.ts
│   └── officernd-sync-run.entity.ts
└── dto/
    ├── index.ts
    ├── query-officernd-sync.dto.ts
    ├── assign-rep.dto.ts
    ├── bulk-assign.dto.ts
    ├── bulk-send-to-pipeline.dto.ts
    └── query-sync-runs.dto.ts
```

### Backend — Modified Files
```
backend/src/app.module.ts               — Add OfficerndModule, ScheduleModule
backend/src/deals/deal.entity.ts        — Add officerndSyncId FK column
backend/src/clients/client.entity.ts    — Widen source enum, include BROKER
backend/package.json                    — Add @nestjs/schedule, @nestjs/axios
```

### Shared — Modified Files
```
packages/shared/src/enums.ts            — Add OfficerndSyncStatus (const + type), OFFICERND_RENEWAL to ClientSource
```

### Frontend — New Files
```
frontend/src/pages/officernd/OfficerndPage.tsx
frontend/src/api/officernd.ts           — API client functions
frontend/src/types/officernd.ts         — TypeScript types
```

### Frontend — Modified Files
```
frontend/src/App.tsx                    — Add /officernd route
frontend/src/layouts/tailwind/AppSidebar.tsx  — Add sidebar item
frontend/src/pages/deals/PipelinePage.tsx     — Distinct card styling for OfficeRnD deals
frontend/src/types/deal.ts             — Add officerndSyncId field
```

### Database
```
backend/src/db/migrations/NNNN-AddOfficerndSyncTables.ts  — Auto-generated migration
```

---

## Task 1: Backend Dependencies & Shared Enums

**Files:**
- Modify: `backend/package.json`
- Modify: `packages/shared/src/enums.ts`
- Modify: `backend/src/clients/client.entity.ts`

- [ ] **Step 1: Install new backend dependencies**

```bash
cd backend && pnpm add @nestjs/schedule @nestjs/axios axios
```

- [ ] **Step 2: Add enums to shared package**

Add to `packages/shared/src/enums.ts` after the `BrokerDocumentType` block (after line 86):

```typescript
export const OfficerndSyncStatus = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  PIPELINED: "PIPELINED",
  IGNORED: "IGNORED",
} as const;
export type OfficerndSyncStatus = (typeof OfficerndSyncStatus)[keyof typeof OfficerndSyncStatus];
```

Add `OFFICERND_RENEWAL: "OFFICERND_RENEWAL"` to the `ClientSource` object (after `WEBSITE`).

- [ ] **Step 3: Widen client entity source enum**

In `backend/src/clients/client.entity.ts` line 17, replace the inline enum array with all `ClientSource` values **plus BROKER** (BROKER is the current default and must remain in the enum):

```typescript
@Column({ type: "varchar", enum: ["MZAD_QATAR", "FACEBOOK", "GOOGLE", "INSTAGRAM", "TIKTOK", "YOUTUBE", "PROPERTY_FINDER", "MAZAD_ARAB", "REFERRAL", "WEBSITE", "BROKER", "OFFICERND_RENEWAL"], default: "BROKER" })
source: string = "BROKER";
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json packages/shared/src/enums.ts backend/src/clients/client.entity.ts
git commit -m "feat: add OfficeRnD dependencies and shared enums"
```

---

## Task 2: Entities — OfficerndSync & OfficerndSyncRun + Deal FK

**Files:**
- Create: `backend/src/officernd/entities/officernd-sync.entity.ts`
- Create: `backend/src/officernd/entities/officernd-sync-run.entity.ts`
- Modify: `backend/src/deals/deal.entity.ts`

- [ ] **Step 1: Create OfficerndSync entity**

Create `backend/src/officernd/entities/officernd-sync.entity.ts`:

```typescript
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";
import { User } from "../../users/user.entity";
import { Client } from "../../clients/client.entity";
import { Deal } from "../../deals/deal.entity";

@Entity("officernd_sync")
export class OfficerndSync extends BaseEntity {
  @Index()
  @Column({ name: "officernd_company_id", type: "varchar" })
  officerndCompanyId: string = "";

  @Column({ name: "company_name", type: "varchar" })
  companyName: string = "";

  @Column({ name: "contact_email", type: "varchar", nullable: true })
  contactEmail: string | null = null;

  @Column({ name: "contact_phone", type: "varchar", nullable: true })
  contactPhone: string | null = null;

  @Index({ unique: true })
  @Column({ name: "membership_id", type: "varchar" })
  membershipId: string = "";

  @Column({ name: "membership_type", type: "varchar", nullable: true })
  membershipType: string | null = null;

  @Column({
    name: "membership_value",
    type: "decimal",
    precision: 15,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v: any) => v,
      from: (v: any) => (v !== null && v !== undefined ? Number(v) : v),
    },
  })
  membershipValue: number | null = null;

  @Index()
  @Column({ name: "end_date", type: "date" })
  endDate: Date = new Date();

  @Column({ name: "officernd_data", type: "jsonb", nullable: true })
  officerndData: Record<string, any> | null = null;

  @Column({
    type: "varchar",
    enum: ["PENDING", "ASSIGNED", "PIPELINED", "IGNORED"],
    default: "PENDING",
  })
  status: string = "PENDING";

  @Column({ name: "assigned_to", type: "uuid", nullable: true })
  assignedTo: string | null = null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to" })
  assignedUser: User | null = null;

  @Column({ name: "client_id", type: "uuid", nullable: true })
  clientId: string | null = null;

  @ManyToOne(() => Client, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "client_id" })
  client: Client | null = null;

  @Column({ name: "deal_id", type: "uuid", nullable: true })
  dealId: string | null = null;

  @ManyToOne(() => Deal, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "deal_id" })
  deal: Deal | null = null;

  @Column({ name: "upstream_changes", type: "jsonb", nullable: true })
  upstreamChanges: Record<string, { old: any; new: any }> | null = null;

  @Column({ name: "upstream_changed_at", type: "timestamptz", nullable: true })
  upstreamChangedAt: Date | null = null;

  @Column({ name: "synced_at", type: "timestamptz" })
  syncedAt: Date = new Date();
}
```

Note: All three FK relations use `onDelete: "SET NULL"` per spec. `officerndCompanyId` has a non-unique `@Index()` for lookups by company.

- [ ] **Step 2: Create OfficerndSyncRun entity**

Create `backend/src/officernd/entities/officernd-sync-run.entity.ts`:

```typescript
import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../common/entities/base.entity";

@Entity("officernd_sync_runs")
export class OfficerndSyncRun extends BaseEntity {
  @Column({ name: "started_at", type: "timestamptz" })
  startedAt: Date = new Date();

  @Column({ name: "finished_at", type: "timestamptz", nullable: true })
  finishedAt: Date | null = null;

  @Column({
    type: "varchar",
    enum: ["RUNNING", "SUCCESS", "FAILED", "SKIPPED"],
  })
  status: string = "RUNNING";

  @Column({ name: "records_processed", type: "int", nullable: true })
  recordsProcessed: number | null = null;

  @Column({ name: "records_created", type: "int", nullable: true })
  recordsCreated: number | null = null;

  @Column({ name: "records_updated", type: "int", nullable: true })
  recordsUpdated: number | null = null;

  @Column({ name: "error_message", type: "text", nullable: true })
  errorMessage: string | null = null;

  @Column({ type: "varchar", enum: ["CRON", "MANUAL"] })
  trigger: string = "CRON";
}
```

Note: Extends `BaseEntity`, so inherits `id`, `createdAt`, `updatedAt`.

- [ ] **Step 3: Add officerndSyncId to Deal entity**

In `backend/src/deals/deal.entity.ts`, add after line 76 (after `stageHistory`):

```typescript
@Column({ name: "officernd_sync_id", type: "uuid", nullable: true })
officerndSyncId: string | null = null;

@ManyToOne(() => OfficerndSync, { nullable: true, onDelete: "SET NULL" })
@JoinColumn({ name: "officernd_sync_id" })
officerndSync: OfficerndSync | null = null;
```

Add import at top: `import { OfficerndSync } from "../officernd/entities/officernd-sync.entity";`

Note: This creates a circular import between `deal.entity.ts` and `officernd-sync.entity.ts`. TypeORM handles this via lazy `() => OfficerndSync` syntax — both entities use this pattern already.

- [ ] **Step 4: Commit**

```bash
git add backend/src/officernd/entities/ backend/src/deals/deal.entity.ts
git commit -m "feat: add OfficerndSync entities and deal FK"
```

---

## Task 3: DTOs

**Files:**
- Create: `backend/src/officernd/dto/index.ts`
- Create: `backend/src/officernd/dto/query-officernd-sync.dto.ts`
- Create: `backend/src/officernd/dto/assign-rep.dto.ts`
- Create: `backend/src/officernd/dto/bulk-assign.dto.ts`
- Create: `backend/src/officernd/dto/bulk-send-to-pipeline.dto.ts`
- Create: `backend/src/officernd/dto/query-sync-runs.dto.ts`

- [ ] **Step 1: Create DTOs**

`backend/src/officernd/dto/query-officernd-sync.dto.ts`:
```typescript
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class QueryOfficerndSyncDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
```

`backend/src/officernd/dto/assign-rep.dto.ts`:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class AssignRepDto {
  @ApiProperty() @IsString() @IsNotEmpty() userId: string = "";
}
```

`backend/src/officernd/dto/bulk-assign.dto.ts`:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, IsNotEmpty, ArrayNotEmpty } from "class-validator";

export class BulkAssignDto {
  @ApiProperty() @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids: string[] = [];
  @ApiProperty() @IsString() @IsNotEmpty() userId: string = "";
}
```

`backend/src/officernd/dto/bulk-send-to-pipeline.dto.ts`:
```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, ArrayNotEmpty } from "class-validator";

export class BulkSendToPipelineDto {
  @ApiProperty() @IsArray() @ArrayNotEmpty() @IsString({ each: true }) ids: string[] = [];
}
```

`backend/src/officernd/dto/query-sync-runs.dto.ts`:
```typescript
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class QuerySyncRunsDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 10;
}
```

`backend/src/officernd/dto/index.ts`:
```typescript
export * from "./query-officernd-sync.dto";
export * from "./assign-rep.dto";
export * from "./bulk-assign.dto";
export * from "./bulk-send-to-pipeline.dto";
export * from "./query-sync-runs.dto";
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/officernd/dto/
git commit -m "feat: add OfficeRnD DTOs"
```

---

## Task 4: OfficerndService — OAuth & Sync

**Files:**
- Create: `backend/src/officernd/officernd.service.ts`

- [ ] **Step 1: Create service with OAuth and sync methods**

Create `backend/src/officernd/officernd.service.ts`. Start with the skeleton, OAuth, and sync methods:

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, Between, ILike, In, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { OfficerndSync } from "./entities/officernd-sync.entity";
import { OfficerndSyncRun } from "./entities/officernd-sync-run.entity";
import { OfficerndSyncStatus as SyncStatus } from "@arafat/shared";
import { Deal } from "../deals/deal.entity";
import { Client } from "../clients/client.entity";
import { User } from "../users/user.entity";
import { QueryOfficerndSyncDto, QuerySyncRunsDto } from "./dto";

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

  private get orgSlug() { return this.configService.get("OFFICERND_ORG_SLUG"); }
  private get apiBase() { return `https://app.officernd.com/api/v2/organizations/${this.orgSlug}`; }

  // --- OAuth ---
  private async authenticate(): Promise<string> { /* ... */ }
  private async getValidToken(): Promise<string> { /* ... */ }

  // --- Sync ---
  async syncMemberships(trigger: "CRON" | "MANUAL"): Promise<void> { /* ... */ }
  private async fetchMemberships(token: string): Promise<any[]> { /* ... */ }
  private async upsertMembership(membership: any): Promise<{ created: boolean; updated: boolean }> { /* ... */ }
}
```

**`authenticate()`:** POST to `https://identity.officernd.com/oauth/token` with `grant_type=client_credentials`, `client_id`, `client_secret`, `scope` from env vars. Cache `access_token` and set `tokenExpiry = now + expires_in - 60s`. One attempt only — throw on failure.

**`syncMemberships(trigger)`:**
1. If `syncLock` is true, return immediately.
2. Set `syncLock = true`.
3. Create `OfficerndSyncRun` with status=RUNNING.
4. `authenticate()`. If fail → run.FAILED, release lock, return.
5. `fetchMemberships(token)` — paginate with `$limit=50`, `$cursorNext` until no more pages.
6. For each membership where `endDate` is in [today, today+90 days] (Asia/Qatar): `upsertMembership(membership)`.
7. Update run: status=SUCCESS, records_processed/created/updated, finished_at.
8. On error: run.FAILED, error_message, finished_at. Release lock.

**`fetchMemberships(token)`:** GET `{apiBase}/billing/memberships` with `Authorization: Bearer {token}`, `$limit=50`. Loop using `$cursorNext` from response. OfficeRnD API URLs (from `docs/officernd-api copy.md`):
- Auth: `https://identity.officernd.com/oauth/token`
- Memberships: `https://app.officernd.com/api/v2/organizations/{orgSlug}/billing/memberships`

**`upsertMembership(membership)`:**
1. Find existing by `membershipId`.
2. If not found: create new row with status=PENDING, all fields from membership.
3. If found and status=PENDING: overwrite all fields freely from OfficeRnD data.
4. If found and status!=PENDING: compare incoming fields against current. If different, set `upstreamChangedAt = now()` and `upstreamChanges = { field: { old, new } }`. Do NOT overwrite typed columns.

- [ ] **Step 2: Add query methods**

```typescript
// --- Queries ---
async getSyncStatus(): Promise<{ lastSync: Date | null; counts: Record<string, number> }> { /* ... */ }
async getExpiringCompanies(query: QueryOfficerndSyncDto) {
  // Paginated. Returns { data, total, page, limit }.
  // PENDING tab: filter by end_date BETWEEN today AND today+90 in Asia/Qatar time.
  // Search: ILike on companyName, contactEmail, contactPhone.
}
async getSyncRuns(query: QuerySyncRunsDto) { /* paginated history */ }
async findSalesReps(): Promise<User[]> { return this.userRepo.find({ where: { role: "SALES", isActive: true } }); }
```

- [ ] **Step 3: Add action methods**

```typescript
// --- Actions ---
async assignSalesRep(id: string, userId: string): Promise<OfficerndSync> { /* set assignedTo, status=ASSIGNED */ }
async unassign(id: string): Promise<OfficerndSync> { /* clear assignedTo, status=PENDING */ }
async bulkAssign(ids: string[], userId: string): Promise<void> { /* batch update */ }
async sendToPipeline(id: string): Promise<{ sync: OfficerndSync; deal: Deal }> {
  // Must use this.dataSource.transaction(async (manager) => { ... })
  // 1. Load sync row. Validate status=ASSIGNED.
  // 2. If no clientId: dedup by email/phone. Create Client if needed.
  //    If contactEmail is null: use `{officerndCompanyId}@officernd.placeholder`.
  //    Source = "OFFICERND_RENEWAL".
  // 3. Create Deal: stage="NEW", stageHistory=["NEW"], status="active",
  //    ownerId=assignedTo, value=membershipValue, title="{companyName} — Renewal",
  //    officerndSyncId=id, location="BARWA_ALSADD", spaceType="CLOSED_OFFICE",
  //    clientId. No broker, no commission.
  // 4. Update sync: dealId, clientId, status=PIPELINED.
}
async bulkSendToPipeline(ids: string[]): Promise<void> { /* batch */ }
async ignore(id: string): Promise<OfficerndSync> { /* status=IGNORED */ }
async unignore(id: string): Promise<OfficerndSync> { /* status=PENDING */ }
async acknowledgeUpstreamChange(id: string): Promise<OfficerndSync> {
  // Read upstreamChanges. For each field, update typed column to new value.
  // Clear upstreamChanges and upstreamChangedAt.
  // Do NOT touch the linked deal.
}
```

- [ ] **Step 4: Add cron decorator**

```typescript
import { Cron } from "@nestjs/schedule";

// Inside the class:
@Cron("7,37 * * * *", { timeZone: "Asia/Qatar" })
async handleCronSync() {
  this.logger.log("Starting scheduled OfficeRnD sync");
  await this.syncMemberships("CRON");
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/officernd/officernd.service.ts
git commit -m "feat: add OfficerndService with OAuth, sync, cron, and pipeline logic"
```

---

## Task 5: OfficerndController

**Files:**
- Create: `backend/src/officernd/officernd.controller.ts`

- [ ] **Step 1: Create controller with all endpoints**

```typescript
import { Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { OfficerndService } from "./officernd.service";
import { Roles } from "../common/decorators";
import { Role } from "@arafat/shared";
import { QueryOfficerndSyncDto, AssignRepDto, BulkAssignDto, BulkSendToPipelineDto, QuerySyncRunsDto } from "./dto";

@ApiTags("OfficeRnD")
@ApiBearerAuth()
@Controller("officernd")
@Roles(Role.ADMIN)
export class OfficerndController {
  constructor(private readonly service: OfficerndService) {}

  @Get("sync-status")
  @ApiOperation({ summary: "Get sync status and counts" })
  getSyncStatus() { return this.service.getSyncStatus(); }

  @Get("sync-runs")
  @ApiOperation({ summary: "Get sync run history" })
  getSyncRuns(@Query() query: QuerySyncRunsDto) { return this.service.getSyncRuns(query); }

  @Get("expiring")
  @ApiOperation({ summary: "List expiring companies" })
  getExpiring(@Query() query: QueryOfficerndSyncDto) { return this.service.getExpiringCompanies(query); }

  @Get("sales-reps")
  @ApiOperation({ summary: "List available sales reps" })
  getSalesReps() { return this.service.findSalesReps(); }

  @Post("sync")
  @ApiOperation({ summary: "Trigger manual sync" })
  triggerSync() { return this.service.syncMemberships("MANUAL"); }

  @Patch(":id/assign")
  @ApiOperation({ summary: "Assign sales rep" })
  assign(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AssignRepDto) { return this.service.assignSalesRep(id, dto.userId); }

  @Patch(":id/unassign")
  @ApiOperation({ summary: "Unassign sales rep" })
  unassign(@Param("id", ParseUUIDPipe) id: string) { return this.service.unassign(id); }

  @Post("bulk-assign")
  @ApiOperation({ summary: "Bulk assign sales rep" })
  bulkAssign(@Body() dto: BulkAssignDto) { return this.service.bulkAssign(dto.ids, dto.userId); }

  @Post(":id/send-to-pipeline")
  @ApiOperation({ summary: "Send renewal to pipeline" })
  sendToPipeline(@Param("id", ParseUUIDPipe) id: string) { return this.service.sendToPipeline(id); }

  @Post("bulk-send-to-pipeline")
  @ApiOperation({ summary: "Bulk send to pipeline" })
  bulkSendToPipeline(@Body() dto: BulkSendToPipelineDto) { return this.service.bulkSendToPipeline(dto.ids); }

  @Patch(":id/ignore")
  @ApiOperation({ summary: "Mark as ignored" })
  ignore(@Param("id", ParseUUIDPipe) id: string) { return this.service.ignore(id); }

  @Patch(":id/unignore")
  @ApiOperation({ summary: "Unignore renewal" })
  unignore(@Param("id", ParseUUIDPipe) id: string) { return this.service.unignore(id); }

  @Patch(":id/acknowledge")
  @ApiOperation({ summary: "Acknowledge upstream changes" })
  acknowledge(@Param("id", ParseUUIDPipe) id: string) { return this.service.acknowledgeUpstreamChange(id); }
}
```

Notes:
- `@Roles(Role.ADMIN)` at class level works because `RolesGuard` uses `reflector.getAllAndOverride` which checks both method and class metadata.
- `@ParseUUIDPipe` on all `:id` params for validation, matching existing controller patterns.
- `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` for Swagger consistency with other controllers.
- `GET /sales-reps` is an addition not in the original spec — needed by the frontend inline assign dropdown.

- [ ] **Step 2: Commit**

```bash
git add backend/src/officernd/officernd.controller.ts
git commit -m "feat: add OfficerndController with all endpoints"
```

---

## Task 6: OfficerndModule & App Registration

**Files:**
- Create: `backend/src/officernd/officernd.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create OfficerndModule**

Create `backend/src/officernd/officernd.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { OfficerndController } from "./officernd.controller";
import { OfficerndService } from "./officernd.service";
import { OfficerndSync } from "./entities/officernd-sync.entity";
import { OfficerndSyncRun } from "./entities/officernd-sync-run.entity";
import { Deal } from "../deals/deal.entity";
import { Client } from "../clients/client.entity";
import { User } from "../users/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([OfficerndSync, OfficerndSyncRun, Deal, Client, User]),
    HttpModule,
  ],
  controllers: [OfficerndController],
  providers: [OfficerndService],
})
export class OfficerndModule {}
```

- [ ] **Step 2: Register in AppModule**

In `backend/src/app.module.ts`:

1. Add imports: `ScheduleModule` from `@nestjs/schedule`, `OfficerndModule` from `./officernd/officernd.module`
2. Add `ScheduleModule.forRoot()` to the `imports` array (before feature modules)
3. Add `OfficerndModule` to the feature module `imports` array

- [ ] **Step 3: Verify app starts**

```bash
cd backend && pnpm dev
```

Expected: App starts on port 3001, no errors. Swagger at `/api/docs` shows the new `officernd` endpoints.

- [ ] **Step 4: Commit**

```bash
git add backend/src/officernd/officernd.module.ts backend/src/app.module.ts
git commit -m "feat: register OfficerndModule and ScheduleModule"
```

---

## Task 7: Database Migration

**Files:**
- Create: auto-generated migration

- [ ] **Step 1: Generate migration**

```bash
cd backend && pnpm migration:generate -- -d ./typeorm.config.ts src/db/migrations/AddOfficerndSyncTables
```

Note: Migrations are stored in `backend/src/db/migrations/` (configured in `typeorm.config.ts`).

Expected: Migration file created with:
- `officernd_sync` table with all columns, unique index on `membership_id`, indexes on `officernd_company_id` and `end_date`
- `officernd_sync_runs` table with all columns
- `officernd_sync_id` column added to `deals` table with FK to `officernd_sync`
- `source` enum widened on `clients` table

- [ ] **Step 2: Review generated migration**

Open the generated migration file and verify:
- All columns have correct types and constraints
- FKs have `ON DELETE SET NULL` (from entity `onDelete: "SET NULL"` options)
- Unique index on `membership_id`
- Indexes on `end_date` and `officernd_company_id`

- [ ] **Step 3: Run migration**

```bash
cd backend && pnpm migration:run
```

Expected: Migration runs without errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/
git commit -m "feat: add OfficeRnD sync tables migration"
```

---

## Task 8: Frontend Types & API Client

**Files:**
- Create: `frontend/src/types/officernd.ts`
- Create: `frontend/src/api/officernd.ts`

- [ ] **Step 1: Create TypeScript types**

Create `frontend/src/types/officernd.ts`:

```typescript
export interface OfficerndSyncItem {
  id: string;
  officerndCompanyId: string;
  companyName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  membershipId: string;
  membershipType: string | null;
  membershipValue: number | null;
  endDate: string;
  status: "PENDING" | "ASSIGNED" | "PIPELINED" | "IGNORED";
  assignedTo: string | null;
  assignedUser: { id: string; name: string | null; email: string } | null;
  clientId: string | null;
  dealId: string | null;
  upstreamChanges: Record<string, { old: any; new: any }> | null;
  upstreamChangedAt: string | null;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfficerndSyncRun {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
  recordsProcessed: number | null;
  recordsCreated: number | null;
  recordsUpdated: number | null;
  errorMessage: string | null;
  trigger: "CRON" | "MANUAL";
}

export interface OfficerndSyncStatusResponse {
  lastSync: string | null;
  counts: Record<string, number>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 2: Create API client**

Create `frontend/src/api/officernd.ts`:

```typescript
import apiClient from "../lib/api-client";
import type { OfficerndSyncItem, OfficerndSyncRun, OfficerndSyncStatusResponse, PaginatedResponse } from "../types/officernd";

export const officerndApi = {
  getSyncStatus: () => apiClient.get<OfficerndSyncStatusResponse>("/officernd/sync-status").then((r) => r.data),
  getSyncRuns: (page = 1) => apiClient.get<PaginatedResponse<OfficerndSyncRun>>("/officernd/sync-runs", { params: { page } }).then((r) => r.data),
  getExpiring: (params: { page?: number; limit?: number; status?: string; search?: string }) =>
    apiClient.get<PaginatedResponse<OfficerndSyncItem>>("/officernd/expiring", { params }).then((r) => r.data),
  getSalesReps: () => apiClient.get<{ id: string; name: string | null; email: string }[]>("/officernd/sales-reps").then((r) => r.data),
  triggerSync: () => apiClient.post("/officernd/sync").then((r) => r.data),
  assign: (id: string, userId: string) => apiClient.patch(`/officernd/${id}/assign`, { userId }).then((r) => r.data),
  unassign: (id: string) => apiClient.patch(`/officernd/${id}/unassign`).then((r) => r.data),
  bulkAssign: (ids: string[], userId: string) => apiClient.post("/officernd/bulk-assign", { ids, userId }).then((r) => r.data),
  sendToPipeline: (id: string) => apiClient.post(`/officernd/${id}/send-to-pipeline`).then((r) => r.data),
  bulkSendToPipeline: (ids: string[]) => apiClient.post("/officernd/bulk-send-to-pipeline", { ids }).then((r) => r.data),
  ignore: (id: string) => apiClient.patch(`/officernd/${id}/ignore`).then((r) => r.data),
  unignore: (id: string) => apiClient.patch(`/officernd/${id}/unignore`).then((r) => r.data),
  acknowledge: (id: string) => apiClient.patch(`/officernd/${id}/acknowledge`).then((r) => r.data),
};
```

Note: Import from `../lib/api-client` (the existing axios instance), not from `./api`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/officernd.ts frontend/src/api/officernd.ts
git commit -m "feat: add OfficeRnD frontend types and API client"
```

---

## Task 9: Frontend — Sidebar & Route

**Files:**
- Modify: `frontend/src/layouts/tailwind/AppSidebar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add sidebar nav item**

In `frontend/src/layouts/tailwind/AppSidebar.tsx`, add to the `navItems` array (after the Deals item, before Reports):

```typescript
{ icon: <BuildingIcon />, name: "OfficeRnD", path: "/officernd", adminOnly: true },
```

Check if `BuildingIcon` exists in `frontend/src/icons/`. If not, add a new SVG icon file following the existing icon pattern, or import `Building2` from `lucide-react`.

- [ ] **Step 2: Add route in App.tsx**

In `frontend/src/App.tsx`, add after the `/users` route (line 33):

```tsx
<Route path="/officernd" element={<RequireRole role="ADMIN"><OfficerndPage /></RequireRole>} />
```

Add the lazy import for `OfficerndPage` following the existing pattern.

- [ ] **Step 3: Verify sidebar renders**

```bash
cd frontend && pnpm dev
```

Expected: Sidebar shows "OfficeRnD" item for ADMIN users. Clicking navigates to `/officernd` (page doesn't exist yet — will show blank).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/tailwind/AppSidebar.tsx frontend/src/App.tsx frontend/src/icons/
git commit -m "feat: add OfficeRnD sidebar item and route"
```

---

## Task 10: Frontend — OfficerndPage

**Files:**
- Create: `frontend/src/pages/officernd/OfficerndPage.tsx`

This is split into 3 sub-steps for manageable implementation.

- [ ] **Step 1: Create page shell — header, summary cards, tabs, search**

Create `frontend/src/pages/officernd/OfficerndPage.tsx` with:
- Header: title "OfficeRnD Renewals", last sync relative time (`Intl.RelativeTimeFormat`), "Sync Now" button (disabled + spinner during sync mutation)
- Summary cards: 4 cards showing PENDING/ASSIGNED/PIPELINED/IGNORED counts (visual only, not clickable)
- Status tabs: All / **Pending** (default) / Assigned / Pipelined / Ignored
- Search bar: covers company name, email, phone

Use `useQuery` for data fetching, `useMutation` for sync trigger. Follow existing page patterns (e.g., `BrokersPage.tsx`).

- [ ] **Step 2: Add data table with inline actions**

Add the data table with columns:
- Checkbox for bulk selection
- Company: `{companyName} — {membershipType || "Unknown"}` + contact info below
- Membership: type + value
- End Date: urgency coloring (`< 7 days` = `text-red-600`, `< 30 days` = `text-amber-600`, expired = red "Expired" badge). All colors meet WCAG contrast.
- Assigned To: inline dropdown of SALES users. Fires `officerndApi.assign(id, userId)` immediately on change — no save button. Invalidates query on success.
- Status badge: PENDING=`bg-gray-100 text-gray-700`, ASSIGNED=`bg-blue-100 text-blue-700`, PIPELINED=`bg-green-100 text-green-700`, IGNORED=`bg-slate-100 text-slate-700`
- Upstream: yellow dot (`w-2 h-2 rounded-full bg-yellow-400`) + tooltip showing diff, "Review" → acknowledge action
- Actions: Send to Pipeline / Ignore / Unassign (context-appropriate per status)

- [ ] **Step 3: Add bulk action bar and confirm modal**

- Bulk action bar (appears when rows selected):
  - "Assign to [dropdown]" — works on PENDING + IGNORED rows
  - "Send to Pipeline" — only enabled when all selected are ASSIGNED
  - "Ignore" — works on PENDING + ASSIGNED
  - "Unignore" — works on IGNORED
  - Incompatible actions greyed out for mixed-status selections
- Confirm modal for bulk actions > 10 rows: "Send 23 renewals to pipeline?"
- Use the shared `Modal` component (not raw `div.fixed.inset-0`)
- "No sales reps available" message + link to `/users` to create one

- [ ] **Step 4: Verify page renders and interacts**

```bash
cd frontend && pnpm dev
```

Expected: Page loads with data from backend (after sync has run). Tabs filter correctly. Inline assign works. Bulk actions work. Confirm modal for > 10 items.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/officernd/
git commit -m "feat: add OfficeRnD triage page with bulk actions"
```

---

## Task 11: Frontend — Pipeline Card Styling

**Files:**
- Modify: `frontend/src/types/deal.ts`
- Modify: `frontend/src/pages/deals/PipelinePage.tsx`

- [ ] **Step 1: Add officerndSyncId to Deal type**

In `frontend/src/types/deal.ts`, add to the `Deal` interface:

```typescript
officerndSyncId?: string | null;
```

- [ ] **Step 2: Update PipelinePage card rendering**

In `frontend/src/pages/deals/PipelinePage.tsx`, in the card rendering section, add conditional styling when `deal.officerndSyncId` is set:

1. Add a small badge: `<span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">OfficeRnD</span>`
2. Show renewal date:
   ```tsx
   {deal.officerndSyncId && deal.expectedCloseDate && (
     <p className="text-xs text-gray-500">
       Renewal by: {new Date(deal.expectedCloseDate).toLocaleDateString()}
     </p>
   )}
   ```
3. Same drag-and-drop behavior — no changes to stage transition logic.

- [ ] **Step 3: Verify pipeline renders OfficeRnD deals correctly**

Push a renewal to pipeline from the OfficeRnD page, then check the pipeline. Expected: card has OfficeRnD badge, shows renewal date, normal drag-and-drop.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/deal.ts frontend/src/pages/deals/PipelinePage.tsx
git commit -m "feat: distinct OfficeRnD card styling in pipeline"
```

---

## Task 12: Integration Test

**Files:**
- Create: `backend/test/officernd.e2e-spec.ts`

- [ ] **Step 1: Write E2E test for key endpoints**

Create `backend/test/officernd.e2e-spec.ts` testing:

1. `GET /api/v1/officernd/sync-status` — returns counts (unauthenticated = 401)
2. `GET /api/v1/officernd/expiring` — returns paginated list (SALES = 403)
3. `PATCH /api/v1/officernd/:id/assign` — assigns rep, changes status to ASSIGNED
4. `POST /api/v1/officernd/:id/send-to-pipeline` — creates deal + client, changes status to PIPELINED
5. `PATCH /api/v1/officernd/:id/ignore` — sets status to IGNORED
6. `PATCH /api/v1/officernd/:id/unignore` — resets status to PENDING
7. `PATCH /api/v1/officernd/:id/acknowledge` — clears upstream changes

Follow existing E2E test patterns (see `backend/test/` for examples). Seed test data in `beforeAll`, clean up in `afterAll`. Set `JWT_SECRET` in `beforeAll` before app init.

Note: Skip testing the actual OfficeRnD API sync in E2E (it hits an external API). Test the sync service with mocked HTTP responses in a unit test instead.

- [ ] **Step 2: Run tests**

```bash
cd backend && pnpm test:e2e -- --testPathPattern=officernd
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/test/officernd.e2e-spec.ts
git commit -m "test: add OfficeRnD E2E tests"
```

---

## Task 13: Environment & Deployment

**Files:**
- Modify: `backend/.env` (local only, not committed)

- [ ] **Step 1: Add OfficeRnD env vars to backend/.env**

```
OFFICERND_ORG_SLUG=arafat-business-centers
OFFICERND_CLIENT_ID=<new-rotated-value>
OFFICERND_CLIENT_SECRET=<rotated-secret>
OFFICERND_GRANT_TYPE=client_credentials
OFFICERND_SCOPE=flex.community.memberships.read flex.community.companies.read
```

**Rotate the client secret** — the original was shared in the uploaded doc.

- [ ] **Step 2: Verify full flow end-to-end**

1. Start backend + frontend: `pnpm dev`
2. Login as ADMIN
3. Click "OfficeRnD" in sidebar
4. Click "Sync Now" — wait for sync to complete
5. Verify companies appear in the table
6. Assign a sales rep to a company
7. Click "Send to Pipeline"
8. Navigate to Pipeline page — verify card appears with OfficeRnD badge
9. Log the first real membership payload (redact PII) to verify whether contact_email/phone are present without `flex.community.members.read` scope. Add the scope if missing.

- [ ] **Step 3: Deploy to VPS**

```bash
.\Deploy-to-VPS.ps1
```

**Important:** On VPS, must `pm2 delete arafatcrm-api && pm2 start ...` to pick up new env vars (gotcha #20). Add the `OFFICERND_*` vars to the VPS `.env` before deploying.
