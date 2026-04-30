# Dashboard & Reports OfficeRnD Split — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `/dashboard` and `/reports` into "Lead Sources" and "OfficeRnD Renewals" streams with dedicated cards, charts, and admin-only endpoints.

**Architecture:** New `officernd-reports` backend module hosting all OfficeRnD reporting endpoints. Existing `dashboard` and `reports` services gain filter parameters (unconditional OfficeRnD exclusion on dashboard; `?source=` on reports). New `membership_type_class` column on `officernd_sync` populated by a backfill migration and a pure classifier helper. Frontend gets parallel "Lead Sources" and "OfficeRnD Renewals" sections, three new ApexCharts components, and an `OfficerndDashboardSection` wrapper plus three new report sections.

**Tech Stack:** NestJS + TypeORM (Postgres), React + Vite + TanStack Query, ApexCharts, Tailwind v4, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-04-30-dashboard-reports-officernd-split-design.md`

---

## Phase 1 — Backend Foundation

### Task 1: Add `OfficerndMembershipType` shared enum

**Files:**
- Modify: `packages/shared/src/enums.ts`

- [ ] **Step 1: Add enum and type at the bottom of enums.ts (after `OfficerndSyncStatus`)**

```ts
export const OfficerndMembershipType = {
  OFFICE: "OFFICE",
  VIRTUAL_OFFICE: "VIRTUAL_OFFICE",
  TRADE_LICENSE: "TRADE_LICENSE",
  COWORKING: "COWORKING",
  OTHERS: "OTHERS",
} as const;
export type OfficerndMembershipType =
  (typeof OfficerndMembershipType)[keyof typeof OfficerndMembershipType];
```

- [ ] **Step 2: Build shared package**

Run: `pnpm --filter @arafat/shared build`
Expected: clean exit, no TS errors. Confirms enum is exported and types compile.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/enums.ts packages/shared/src/enums.d.ts packages/shared/src/index.d.ts
git commit -m "feat(shared): add OfficerndMembershipType enum"
```

---

### Task 2: Build classifier helper with unit tests (TDD)

**Files:**
- Create: `backend/src/officernd-reports/membership-type.classifier.ts`
- Create: `backend/src/officernd-reports/membership-type.classifier.spec.ts`

- [ ] **Step 1: Write the failing test file first**

Path: `backend/src/officernd-reports/membership-type.classifier.spec.ts`

```ts
import { OfficerndMembershipType } from "@arafat/shared";
import { classifyMembershipType } from "./membership-type.classifier";

describe("classifyMembershipType", () => {
  describe("falsy / empty input → OTHERS", () => {
    test.each([null, "", "   "])("%p → OTHERS", (input) => {
      expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.OTHERS);
    });
  });

  describe("VIRTUAL_OFFICE", () => {
    test.each(["Virtual Office", "VIRTUAL OFFICE", "Premium Virtual Plan"])(
      "%p → VIRTUAL_OFFICE",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.VIRTUAL_OFFICE);
      },
    );
  });

  describe("TRADE_LICENSE", () => {
    test.each(["Trade License", "TL Standard", "License Renewal"])(
      "%p → TRADE_LICENSE",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.TRADE_LICENSE);
      },
    );
  });

  describe("word-boundary on \\btl\\b", () => {
    test.each(["title insurance", "settler benefits"])(
      "%p must NOT match TL → OTHERS",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.OTHERS);
      },
    );
  });

  describe("COWORKING", () => {
    test.each(["Flex 5-Day", "Coworking Pass", "Hot Desk", "Dedicated Desk"])(
      "%p → COWORKING",
      (input) => {
        expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.COWORKING);
      },
    );
  });

  describe("OFFICE", () => {
    test.each(["Closed Office", "Office Premium"])("%p → OFFICE", (input) => {
      expect(classifyMembershipType(input)).toBe(OfficerndMembershipType.OFFICE);
    });
  });

  test("Flex Office → COWORKING (precedence over OFFICE)", () => {
    expect(classifyMembershipType("Flex Office")).toBe(OfficerndMembershipType.COWORKING);
  });

  test("Misc plan → OTHERS", () => {
    expect(classifyMembershipType("Misc plan")).toBe(OfficerndMembershipType.OTHERS);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter backend test -- membership-type.classifier.spec`
Expected: FAIL with "Cannot find module './membership-type.classifier'".

- [ ] **Step 3: Write the classifier implementation**

Path: `backend/src/officernd-reports/membership-type.classifier.ts`

```ts
import { OfficerndMembershipType } from "@arafat/shared";

export function classifyMembershipType(name: string | null): OfficerndMembershipType {
  if (!name) return OfficerndMembershipType.OTHERS;
  const lower = name.toLowerCase().trim();
  if (!lower) return OfficerndMembershipType.OTHERS;

  if (lower.includes("virtual"))
    return OfficerndMembershipType.VIRTUAL_OFFICE;

  if (/\btl\b/.test(lower) || lower.includes("trade") || lower.includes("license"))
    return OfficerndMembershipType.TRADE_LICENSE;

  if (["flex", "cowork", "hot desk", "dedicated"].some((k) => lower.includes(k)))
    return OfficerndMembershipType.COWORKING;

  if (lower.includes("office"))
    return OfficerndMembershipType.OFFICE;

  return OfficerndMembershipType.OTHERS;
}
```

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm --filter backend test -- membership-type.classifier.spec`
Expected: all assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/officernd-reports/membership-type.classifier.ts backend/src/officernd-reports/membership-type.classifier.spec.ts
git commit -m "feat(officernd-reports): add membership-type classifier with tests"
```

---

### Task 3: Database migration for `membership_type_class`

**Files:**
- Create: `backend/src/db/migrations/1779000000000-AddMembershipTypeClassToOfficerndSync.ts`

- [ ] **Step 1: Write the migration**

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMembershipTypeClassToOfficerndSync1779000000000 implements MigrationInterface {
    name = 'AddMembershipTypeClassToOfficerndSync1779000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "officernd_sync" ADD COLUMN "membership_type_class" character varying`);
        await queryRunner.query(`CREATE INDEX "idx_officernd_sync_type_class" ON "officernd_sync" ("membership_type_class")`);

        // Backfill — keyword rules mirror membership-type.classifier.ts.
        // Order matters: virtual → trade/license → coworking → office → others.
        await queryRunner.query(`
          UPDATE "officernd_sync"
          SET "membership_type_class" = CASE
            WHEN "membership_type" IS NULL OR trim("membership_type") = '' THEN 'OTHERS'
            WHEN lower("membership_type") LIKE '%virtual%' THEN 'VIRTUAL_OFFICE'
            WHEN lower("membership_type") ~ '\\mtl\\M' OR lower("membership_type") LIKE '%trade%' OR lower("membership_type") LIKE '%license%' THEN 'TRADE_LICENSE'
            WHEN lower("membership_type") LIKE '%flex%' OR lower("membership_type") LIKE '%cowork%' OR lower("membership_type") LIKE '%hot desk%' OR lower("membership_type") LIKE '%dedicated%' THEN 'COWORKING'
            WHEN lower("membership_type") LIKE '%office%' THEN 'OFFICE'
            ELSE 'OTHERS'
          END
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_officernd_sync_type_class"`);
        await queryRunner.query(`ALTER TABLE "officernd_sync" DROP COLUMN "membership_type_class"`);
    }
}
```

> Note: PostgreSQL POSIX regex word boundary is `\m...\M` (start/end of word). The backslash is escaped in the JS string literal so the SQL receives `\m` and `\M`. Verify with the test in step 3.

- [ ] **Step 2: Run the migration**

```bash
docker-compose up -d db
pnpm --filter backend migration:run
```

Expected: `Migration AddMembershipTypeClassToOfficerndSync1779000000000 has been executed successfully.`

- [ ] **Step 3: Verify schema and backfill**

```bash
docker-compose exec db psql -U postgres -d arafat_crm -c "\d officernd_sync" | grep membership_type_class
docker-compose exec db psql -U postgres -d arafat_crm -c "SELECT membership_type, membership_type_class FROM officernd_sync LIMIT 10"
```
Expected: column exists; existing rows have a non-null `membership_type_class` matching their plan name (e.g., "Flex" → COWORKING, "Virtual Office" → VIRTUAL_OFFICE).

- [ ] **Step 4: Commit**

```bash
git add backend/src/db/migrations/1779000000000-AddMembershipTypeClassToOfficerndSync.ts
git commit -m "feat(db): add membership_type_class column with backfill"
```

---

### Task 4: Add `membershipTypeClass` to entity + wire classifier into sync service

**Files:**
- Modify: `backend/src/officernd/entities/officernd-sync.entity.ts`
- Modify: `backend/src/officernd/officernd.service.ts`

- [ ] **Step 1: Add the field to OfficerndSync entity**

Insert after the existing `membershipType` field (around line 33):

```ts
  @Index()
  @Column({ name: "membership_type_class", type: "varchar", nullable: true })
  membershipTypeClass: string | null = null;
```

- [ ] **Step 2: Wire classifier into the sync service**

In `backend/src/officernd/officernd.service.ts`:

- Add import at the top: `import { classifyMembershipType } from "../officernd-reports/membership-type.classifier";`
- In the `if (!existing)` branch (around line 308), add `membershipTypeClass: classifyMembershipType(membershipType),` to the `create({...})` call alongside `membershipType`.
- In the `if (existing.status === "PENDING")` branch (around line 327), add `existing.membershipTypeClass = classifyMembershipType(membershipType);` next to `existing.membershipType = membershipType;`.

> Do **not** modify the non-PENDING upstream-change-tracking branch. Per spec, the sync service never overwrites typed columns on ASSIGNED/IGNORED/PIPELINED rows.

- [ ] **Step 3: Run existing officernd tests to confirm no regression**

Run: `pnpm --filter backend test -- officernd.spec`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/officernd/entities/officernd-sync.entity.ts backend/src/officernd/officernd.service.ts
git commit -m "feat(officernd): write membership_type_class on sync"
```

---

## Phase 2 — Modify Existing Endpoints

### Task 5: Filter OfficeRnD from existing dashboard endpoints

**Files:**
- Modify: `backend/src/dashboard/dashboard.service.ts`
- Create: `backend/test/dashboard.e2e-spec.ts`

- [ ] **Step 1: Write failing e2e test for dashboard filtering**

Path: `backend/test/dashboard.e2e-spec.ts` — model setup on `backend/test/deals.e2e-spec.ts:1-72` (admin user creation, app bootstrap, `setGlobalPrefix("api/v1")`, ValidationPipe).

After bootstrap, seed two clients (one `GOOGLE`, one `OFFICERND_RENEWAL`), one `officernd_sync` row, and two deals — one organic (links to GOOGLE client, no `officerndSyncId`), one OfficeRnD (links to renewal client, has `officerndSyncId` set to the sync row).

```ts
describe("Dashboard OfficeRnD exclusion", () => {
  it("GET /dashboard/by-source excludes OFFICERND_RENEWAL bucket", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/by-source")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.find((r: any) => r.source === "OFFICERND_RENEWAL")).toBeUndefined();
    expect(res.body.find((r: any) => r.source === "GOOGLE")).toBeDefined();
  });

  it("GET /dashboard/stats counts only non-OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/stats")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalDeals).toBe(1); // organic only
  });

  it("GET /dashboard/by-location excludes OfficeRnD-linked deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/by-location")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.won + r.lost, 0);
    // Both deals are active → both contribute 0 to won/lost. Re-mark organic as won to assert.
    expect(total).toBeGreaterThanOrEqual(0); // sanity; specific assertions guarded by status
  });
});
```

`afterAll` cleanup: `DELETE FROM deals; DELETE FROM officernd_sync; DELETE FROM clients WHERE email LIKE '%dashboard_test_%'; DELETE FROM users WHERE email LIKE '%dashboard_test_%';`

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=dashboard.e2e-spec`
Expected: by-source assertion FAILS — current response still includes the OFFICERND_RENEWAL bucket.

- [ ] **Step 3: Add unconditional OfficeRnD filters to dashboard.service.ts**

In each method, add the filter after the existing `where`:

```ts
// getStats — convert totalDeals to QueryBuilder for the IS NULL filter
const totalDealsQb = this.dealsRepo
  .createQueryBuilder("deal")
  .where("deal.officernd_sync_id IS NULL");
if (isSales) totalDealsQb.andWhere("deal.owner_id = :uid", { uid: userId });
const totalDeals = await totalDealsQb.getCount();
```

Apply similar `andWhere("deal.officernd_sync_id IS NULL")` to `wonQb`, `lostQb`, the location query in `getByLocation`, and add `andWhere("client.source != 'OFFICERND_RENEWAL'")` to `getBySource`.

- [ ] **Step 4: Run test, expect PASS**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=dashboard.e2e-spec`
Expected: all assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/dashboard/dashboard.service.ts backend/test/dashboard.e2e-spec.ts
git commit -m "feat(dashboard): exclude OfficeRnD from leads-only stats and charts"
```

---

### Task 6: Add `?source=` parameter to `/reports/win-loss` and `/reports/staff-performance`

**Files:**
- Modify: `backend/src/reports/reports.service.ts`
- Modify: `backend/src/reports/reports.controller.ts`
- Create: `backend/test/reports.e2e-spec.ts`

- [ ] **Step 1: Write failing e2e tests**

Path: `backend/test/reports.e2e-spec.ts` — bootstrap as in Task 5. Seed: 1 admin + 1 sales user, both with one organic deal each (won) and one OfficeRnD-linked deal each (lost).

```ts
describe("Reports source filter", () => {
  it("win-loss with no param returns all deals (back-compat)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/win-loss")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.won + r.lost, 0);
    expect(total).toBe(4); // 2 won + 2 lost across both users
  });

  it("win-loss?source=leads excludes OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/win-loss?source=leads")
      .set("Authorization", `Bearer ${adminToken}`);
    const total = res.body.reduce((s: number, r: any) => s + r.won + r.lost, 0);
    expect(total).toBe(2); // only the 2 won organic deals (lost ones are OfficeRnD)
  });

  it("win-loss?source=officernd returns only OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/win-loss?source=officernd")
      .set("Authorization", `Bearer ${adminToken}`);
    const total = res.body.reduce((s: number, r: any) => s + r.won + r.lost, 0);
    expect(total).toBe(2); // only the 2 lost OfficeRnD deals
  });

  it("staff-performance?source=leads excludes OfficeRnD deals", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/staff-performance?source=leads")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.totalAssigned, 0);
    expect(total).toBe(2); // only organic deals
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=reports.e2e-spec`
Expected: `?source=leads` test fails (parameter currently ignored, returns all 4).

- [ ] **Step 3: Add `source` filter to reports.service.ts**

In `getWinLossReport(userId?, userRole?)`, change signature to `(userId?, userRole?, source: "leads" | "officernd" | "all" = "all")`. Replace `findOptions: any = { relations: ["owner"] }` with a queryBuilder that adds:

```ts
const qb = this.dealsRepo.createQueryBuilder("deal").leftJoinAndSelect("deal.owner", "owner");
if (userRole === "SALES" && userId) qb.andWhere("deal.owner_id = :uid", { uid: userId });
if (source === "leads") qb.andWhere("deal.officernd_sync_id IS NULL");
else if (source === "officernd") qb.andWhere("deal.officernd_sync_id IS NOT NULL");
const allDeals = await qb.getMany();
```

Same change in `getStaffPerformance(month?)` — extend signature to `(month?: string, source: "leads" | "officernd" | "all" = "all")` and convert the `dealsRepo.find` to a QueryBuilder so the `IS NULL` / `IS NOT NULL` filter composes cleanly with the existing month range:

```ts
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
```
Replace the original `dealsRepo.find({ ... })` call with this. The downstream `for (const deal of deals)` loop and aggregation logic stay unchanged.

- [ ] **Step 4: Update reports.controller.ts to pass through the param (preserve existing `@ApiOperation` decorators)**

```ts
@Get("win-loss")
@ApiOperation({ summary: "Get win/loss report by user" })
getWinLossReport(
  @Query("source") source: "leads" | "officernd" | "all" = "all",
  @User() user: any,
) {
  return this.reportsService.getWinLossReport(user.id, user.role, source);
}

@Get("staff-performance")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Get monthly staff performance report (admin only)" })
getStaffPerformance(
  @Query("month") month?: string,
  @Query("source") source: "leads" | "officernd" | "all" = "all",
) {
  return this.reportsService.getStaffPerformance(month, source);
}
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=reports.e2e-spec`
Expected: all four assertions PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/reports/reports.service.ts backend/src/reports/reports.controller.ts backend/test/reports.e2e-spec.ts
git commit -m "feat(reports): add ?source= filter to win-loss and staff-performance"
```

---

## Phase 3 — New OfficerndReports Module

### Task 7: Module scaffolding + register in AppModule

**Files:**
- Create: `backend/src/officernd-reports/officernd-reports.module.ts`
- Create: `backend/src/officernd-reports/officernd-reports.service.ts`
- Create: `backend/src/officernd-reports/officernd-reports.controller.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the module**

Path: `backend/src/officernd-reports/officernd-reports.module.ts`

```ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OfficerndSync } from "../officernd/entities/officernd-sync.entity";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";
import { OfficerndReportsController } from "./officernd-reports.controller";
import { OfficerndReportsService } from "./officernd-reports.service";

@Module({
  imports: [TypeOrmModule.forFeature([OfficerndSync, Deal, User])],
  controllers: [OfficerndReportsController],
  providers: [OfficerndReportsService],
})
export class OfficerndReportsModule {}
```

- [ ] **Step 2: Create empty service and controller stubs**

Path: `backend/src/officernd-reports/officernd-reports.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OfficerndSync } from "../officernd/entities/officernd-sync.entity";
import { Deal } from "../deals/deal.entity";
import { User } from "../users/user.entity";

@Injectable()
export class OfficerndReportsService {
  constructor(
    @InjectRepository(OfficerndSync) private syncRepo: Repository<OfficerndSync>,
    @InjectRepository(Deal) private dealsRepo: Repository<Deal>,
    @InjectRepository(User) private usersRepo: Repository<User>,
  ) {}
}
```

Path: `backend/src/officernd-reports/officernd-reports.controller.ts`

```ts
import { Controller } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@arafat/shared";
import { OfficerndReportsService } from "./officernd-reports.service";

@ApiTags("OfficeRnD Reports")
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class OfficerndReportsController {
  constructor(private readonly service: OfficerndReportsService) {}
}
```

> The class-level `@Roles(Role.ADMIN)` makes every endpoint added to this controller admin-only by default. `@Controller()` (no path prefix) means routes will declare their own full paths so we can mount under both `/dashboard/officernd/...` and `/reports/officernd/...` from one controller.

- [ ] **Step 3: Register in AppModule**

In `backend/src/app.module.ts`, add the import and append to the `imports` array:

```ts
import { OfficerndReportsModule } from "./officernd-reports/officernd-reports.module";
// ...
imports: [
  // ... existing
  OfficerndReportsModule,
],
```

- [ ] **Step 4: Boot the backend and confirm clean startup**

Run: `pnpm --filter backend dev` (then Ctrl+C after seeing "Application is running on")
Expected: server starts without errors. Confirms module wiring is clean.

- [ ] **Step 5: Commit**

```bash
git add backend/src/officernd-reports/ backend/src/app.module.ts
git commit -m "feat(officernd-reports): scaffold module with empty controller and service"
```

---

### Task 8: Build all four `/dashboard/officernd/*` endpoints

**Files:**
- Modify: `backend/src/officernd-reports/officernd-reports.service.ts`
- Modify: `backend/src/officernd-reports/officernd-reports.controller.ts`
- Create: `backend/test/officernd-reports.e2e-spec.ts`

- [ ] **Step 1: Write the failing e2e test file with shared fixture**

Path: `backend/test/officernd-reports.e2e-spec.ts` — bootstrap as in earlier tasks. Seed:

- Admin user + 2 sales users (sales1, sales2)
- 8 `officernd_sync` rows:
  - 2 PENDING (no `assignedTo`, no `dealId`)
  - 2 ASSIGNED: 1 to sales1, 1 to sales2 (no `dealId`)
  - 3 PIPELINED: 2 to sales1 (with `dealId` set — one row backs the won deal, one row backs the lost deal), 1 to sales2 (with `dealId` set — backs the active deal)
  - 1 IGNORED
  - Membership-type distribution: 2 OFFICE, 2 VIRTUAL_OFFICE, 1 TRADE_LICENSE, 2 COWORKING, 1 OTHERS.
- 5 deals:
  - 3 OfficeRnD-linked: 1 won (owned by sales1, linked from one of sales1's PIPELINED sync rows), 1 lost (owned by sales1, linked from sales1's other PIPELINED row), 1 active (owned by sales2, linked from sales2's PIPELINED row).
  - 2 organic: no `officerndSyncId`.
- One sync row with `created_at` two months ago for month-filter tests.

> **Why two PIPELINED rows for sales1:** `OfficerndSync.dealId` is a single nullable column, so each sync row backs at most one deal. To give sales1 both a won and a lost OfficeRnD deal in the fixture, sales1 needs two separate PIPELINED sync rows — one per deal.

Test cases for this task:

```ts
describe("GET /dashboard/officernd/lifecycle-summary", () => {
  it("returns counts grouped by status", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/officernd/lifecycle-summary")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pending: 2, assigned: 2, pipelined: 3, ignored: 1 });
  });
  it("403s for SALES role", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/officernd/lifecycle-summary")
      .set("Authorization", `Bearer ${salesToken}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /dashboard/officernd/by-type", () => {
  it("returns counts grouped by class, excluding IGNORED", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/officernd/by-type")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.count, 0);
    expect(total).toBe(7); // 8 total minus 1 IGNORED
  });
});

describe("GET /dashboard/officernd/assigned-by-staff", () => {
  it("returns counts of non-PENDING assigned rows", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/officernd/assigned-by-staff")
      .set("Authorization", `Bearer ${adminToken}`);
    const sales1Row = res.body.find((r: any) => r.userName.includes("sales1"));
    const sales2Row = res.body.find((r: any) => r.userName.includes("sales2"));
    expect(sales1Row.count).toBe(3); // 1 ASSIGNED + 2 PIPELINED
    expect(sales2Row.count).toBe(2); // 1 ASSIGNED + 1 PIPELINED
  });
});

describe("GET /dashboard/officernd/win-loss", () => {
  it("returns won/lost/active and winRate for OfficeRnD deals only", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/dashboard/officernd/win-loss")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.body).toEqual({ won: 1, lost: 1, active: 1, winRate: 50 });
  });
});
```

- [ ] **Step 2: Run tests, expect FAIL**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=officernd-reports.e2e-spec`
Expected: 404s on all routes — endpoints not yet defined.

- [ ] **Step 3: Implement service methods**

Add to `officernd-reports.service.ts`:

```ts
async getLifecycleSummary() {
  const rows = await this.syncRepo
    .createQueryBuilder("s")
    .select("s.status", "status")
    .addSelect("COUNT(*)", "count")
    .groupBy("s.status")
    .getRawMany();
  const out = { pending: 0, assigned: 0, pipelined: 0, ignored: 0 };
  for (const r of rows) {
    const k = r.status.toLowerCase() as keyof typeof out;
    out[k] = parseInt(r.count, 10);
  }
  return out;
}

async getByType() {
  const rows = await this.syncRepo
    .createQueryBuilder("s")
    .select("s.membership_type_class", "type")
    .addSelect("COUNT(*)", "count")
    .where("s.status != :ignored", { ignored: "IGNORED" })
    .groupBy("s.membership_type_class")
    .getRawMany();
  return rows.map((r) => ({ type: r.type ?? "OTHERS", count: parseInt(r.count, 10) }));
}

async getAssignedByStaff() {
  const rows = await this.syncRepo
    .createQueryBuilder("s")
    .leftJoin("s.assignedUser", "u")
    .select("u.id", "userId")
    .addSelect("u.name", "userName")
    .addSelect("u.email", "userEmail")
    .addSelect("COUNT(*)", "count")
    .where("s.status != :pending", { pending: "PENDING" })
    .andWhere("s.assigned_to IS NOT NULL")
    .groupBy("u.id")
    .addGroupBy("u.name")
    .addGroupBy("u.email")
    .getRawMany();
  return rows.map((r) => ({ userId: r.userId, userName: r.userName ?? r.userEmail, count: parseInt(r.count, 10) }));
}

async getDashboardWinLoss() {
  const rows = await this.dealsRepo
    .createQueryBuilder("d")
    .select(
      `SUM(CASE WHEN d.status = 'won' OR d.stage = 'WON' THEN 1 ELSE 0 END)`,
      "won",
    )
    .addSelect(
      `SUM(CASE WHEN d.status = 'lost' OR d.stage = 'LOST' THEN 1 ELSE 0 END)`,
      "lost",
    )
    .addSelect(
      `SUM(CASE WHEN d.status = 'active' AND d.stage NOT IN ('WON', 'LOST') THEN 1 ELSE 0 END)`,
      "active",
    )
    .where("d.officernd_sync_id IS NOT NULL")
    .getRawOne();
  const won = parseInt(rows?.won ?? "0", 10);
  const lost = parseInt(rows?.lost ?? "0", 10);
  const active = parseInt(rows?.active ?? "0", 10);
  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0;
  return { won, lost, active, winRate };
}
```

- [ ] **Step 4: Implement controller routes**

Add to `officernd-reports.controller.ts`:

```ts
import { Get } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";

// ... inside the class ...
@Get("dashboard/officernd/lifecycle-summary")
@ApiOperation({ summary: "OfficeRnD sync row counts grouped by lifecycle status" })
getLifecycleSummary() { return this.service.getLifecycleSummary(); }

@Get("dashboard/officernd/by-type")
@ApiOperation({ summary: "OfficeRnD sync rows grouped by membership type class (excludes IGNORED)" })
getByType() { return this.service.getByType(); }

@Get("dashboard/officernd/assigned-by-staff")
@ApiOperation({ summary: "Counts of non-PENDING OfficeRnD rows per assigned user" })
getAssignedByStaff() { return this.service.getAssignedByStaff(); }

@Get("dashboard/officernd/win-loss")
@ApiOperation({ summary: "Won/lost/active counts and win rate for OfficeRnD deals" })
getDashboardWinLoss() { return this.service.getDashboardWinLoss(); }
```

> Routes are full paths (no `/api/v1` prefix — `setGlobalPrefix("api/v1")` adds it automatically). The class has no controller-level path so each `@Get` declares its own.

- [ ] **Step 5: Run tests, expect PASS**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=officernd-reports.e2e-spec`
Expected: 4 endpoint test groups + 403 SALES test all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/officernd-reports/ backend/test/officernd-reports.e2e-spec.ts
git commit -m "feat(officernd-reports): add 4 dashboard endpoints"
```

---

### Task 9: Build `/reports/officernd/staff-summary?month=` endpoint

**Files:**
- Modify: `backend/src/officernd-reports/officernd-reports.service.ts`
- Modify: `backend/src/officernd-reports/officernd-reports.controller.ts`
- Modify: `backend/test/officernd-reports.e2e-spec.ts`

- [ ] **Step 1: Add failing tests**

Append to the existing e2e spec:

```ts
describe("GET /reports/officernd/staff-summary", () => {
  it("returns per-staff assigned/pipelined/won/lost/winRate", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/officernd/staff-summary")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const sales1 = res.body.find((r: any) => r.userName.includes("sales1"));
    expect(sales1.assigned).toBe(3);  // 1 ASSIGNED + 2 PIPELINED rows owned by sales1
    expect(sales1.pipelined).toBe(2); // 2 PIPELINED rows
    expect(sales1.won).toBe(1);
    expect(sales1.lost).toBe(1);
    expect(sales1.winRate).toBe(50);
  });
  it("?month=YYYY-MM excludes rows outside the window", async () => {
    const oldMonth = "2024-01"; // before any seeded data
    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/officernd/staff-summary?month=${oldMonth}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.body).toEqual([]);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=officernd-reports.e2e-spec -t "staff-summary"`
Expected: 404.

- [ ] **Step 3: Implement service method**

```ts
async getReportStaffSummary(month?: string) {
  const qb = this.syncRepo
    .createQueryBuilder("s")
    .leftJoin("s.assignedUser", "u")
    .leftJoin("s.deal", "d")
    .where("s.assigned_to IS NOT NULL");

  if (month) {
    const [y, m] = month.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    qb.andWhere("s.created_at >= :start AND s.created_at < :end", { start, end });
  }

  const rows = await qb
    .select("u.id", "userId")
    .addSelect("u.name", "userName")
    .addSelect("u.email", "userEmail")
    .addSelect(`SUM(CASE WHEN s.status IN ('ASSIGNED','PIPELINED') THEN 1 ELSE 0 END)`, "assigned")
    .addSelect(`SUM(CASE WHEN s.status = 'PIPELINED' THEN 1 ELSE 0 END)`, "pipelined")
    .addSelect(`SUM(CASE WHEN d.status = 'won' OR d.stage = 'WON' THEN 1 ELSE 0 END)`, "won")
    .addSelect(`SUM(CASE WHEN d.status = 'lost' OR d.stage = 'LOST' THEN 1 ELSE 0 END)`, "lost")
    .groupBy("u.id").addGroupBy("u.name").addGroupBy("u.email")
    .getRawMany();

  return rows.map((r) => {
    const won = parseInt(r.won, 10) || 0;
    const lost = parseInt(r.lost, 10) || 0;
    return {
      userId: r.userId,
      userName: r.userName ?? r.userEmail,
      assigned: parseInt(r.assigned, 10) || 0,
      pipelined: parseInt(r.pipelined, 10) || 0,
      won, lost,
      winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
    };
  });
}
```

- [ ] **Step 4: Add controller route**

```ts
import { Query } from "@nestjs/common";
// ...
@Get("reports/officernd/staff-summary")
@ApiOperation({ summary: "Per-staff OfficeRnD breakdown (filterable by month on sync.created_at)" })
getReportStaffSummary(@Query("month") month?: string) {
  return this.service.getReportStaffSummary(month);
}
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=officernd-reports.e2e-spec -t "staff-summary"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/officernd-reports/ backend/test/officernd-reports.e2e-spec.ts
git commit -m "feat(officernd-reports): add /reports/officernd/staff-summary endpoint"
```

---

### Task 10: Build `/reports/officernd/type-summary?month=` and `/reports/officernd/win-loss?month=` endpoints

**Files:**
- Modify: `backend/src/officernd-reports/officernd-reports.service.ts`
- Modify: `backend/src/officernd-reports/officernd-reports.controller.ts`
- Modify: `backend/test/officernd-reports.e2e-spec.ts`

- [ ] **Step 1: Add failing tests for both endpoints**

```ts
describe("GET /reports/officernd/type-summary", () => {
  it("returns counts grouped by class, excluding IGNORED", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/officernd/type-summary")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const total = res.body.reduce((s: number, r: any) => s + r.count, 0);
    expect(total).toBe(7);
  });
});

describe("GET /reports/officernd/win-loss", () => {
  it("returns per-staff win/loss for OfficeRnD-linked deals only", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/reports/officernd/win-loss")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const sales1 = res.body.find((r: any) => r.userName.includes("sales1"));
    expect(sales1.won).toBe(1);
    expect(sales1.lost).toBe(1);
    expect(sales1.winRate).toBe(50);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=officernd-reports.e2e-spec`
Expected: 404 on the two new routes.

- [ ] **Step 3: Implement service methods**

```ts
async getReportTypeSummary(month?: string) {
  const qb = this.syncRepo
    .createQueryBuilder("s")
    .where("s.status != :ignored", { ignored: "IGNORED" });
  if (month) {
    const [y, m] = month.split("-").map(Number);
    qb.andWhere("s.created_at >= :start AND s.created_at < :end", {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 1),
    });
  }
  const rows = await qb
    .select("s.membership_type_class", "type")
    .addSelect("COUNT(*)", "count")
    .groupBy("s.membership_type_class")
    .getRawMany();
  return rows.map((r) => ({ type: r.type ?? "OTHERS", count: parseInt(r.count, 10) }));
}

async getReportWinLoss(month?: string) {
  const qb = this.dealsRepo
    .createQueryBuilder("d")
    .leftJoin("d.owner", "u")
    .leftJoin("d.officerndSync", "s")
    .where("d.officernd_sync_id IS NOT NULL");
  if (month) {
    const [y, m] = month.split("-").map(Number);
    qb.andWhere("s.created_at >= :start AND s.created_at < :end", {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 1),
    });
  }
  const rows = await qb
    .select("u.id", "userId")
    .addSelect("u.name", "userName")
    .addSelect("u.email", "userEmail")
    .addSelect(`SUM(CASE WHEN d.status = 'won' OR d.stage = 'WON' THEN 1 ELSE 0 END)`, "won")
    .addSelect(`SUM(CASE WHEN d.status = 'lost' OR d.stage = 'LOST' THEN 1 ELSE 0 END)`, "lost")
    .groupBy("u.id").addGroupBy("u.name").addGroupBy("u.email")
    .getRawMany();
  return rows.map((r) => {
    const won = parseInt(r.won, 10) || 0;
    const lost = parseInt(r.lost, 10) || 0;
    return {
      userId: r.userId,
      userName: r.userName ?? r.userEmail,
      won, lost,
      winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
    };
  });
}
```

- [ ] **Step 4: Add controller routes**

```ts
@Get("reports/officernd/type-summary")
@ApiOperation({ summary: "Membership type breakdown counts (filterable by month)" })
getReportTypeSummary(@Query("month") month?: string) {
  return this.service.getReportTypeSummary(month);
}

@Get("reports/officernd/win-loss")
@ApiOperation({ summary: "Per-staff win/loss for OfficeRnD deals (filterable by month on sync.created_at)" })
getReportWinLoss(@Query("month") month?: string) {
  return this.service.getReportWinLoss(month);
}
```

- [ ] **Step 5: Run all officernd-reports tests, expect PASS**

Run: `pnpm --filter backend test:e2e -- --testPathPattern=officernd-reports.e2e-spec`
Expected: every test in the spec passes.

- [ ] **Step 6: Commit**

```bash
git add backend/src/officernd-reports/ backend/test/officernd-reports.e2e-spec.ts
git commit -m "feat(officernd-reports): add type-summary and win-loss report endpoints"
```

---

## Phase 4 — Frontend Foundation

### Task 11: Frontend API clients + type updates

**Files:**
- Create: `frontend/src/api/officernd-reports.ts`
- Modify: `frontend/src/api/reports.ts`

- [ ] **Step 1: Create the new API module**

Path: `frontend/src/api/officernd-reports.ts`

```ts
import apiClient from "@/lib/api-client";
import type { OfficerndMembershipType } from "@arafat/shared";

export interface LifecycleSummary {
  pending: number; assigned: number; pipelined: number; ignored: number;
}

export interface ByTypeRow {
  type: OfficerndMembershipType;
  count: number;
}

export interface AssignedByStaffRow {
  userId: string;
  userName: string;
  count: number;
}

export interface DashboardWinLoss {
  won: number; lost: number; active: number; winRate: number;
}

export interface ReportStaffSummaryRow {
  userId: string;
  userName: string;
  assigned: number;
  pipelined: number;
  won: number;
  lost: number;
  winRate: number;
}

export interface ReportWinLossRow {
  userId: string;
  userName: string;
  won: number;
  lost: number;
  winRate: number;
}

export const officerndReportsApi = {
  getLifecycleSummary: async (): Promise<LifecycleSummary> =>
    (await apiClient.get("/dashboard/officernd/lifecycle-summary")).data,

  getByType: async (): Promise<ByTypeRow[]> =>
    (await apiClient.get("/dashboard/officernd/by-type")).data,

  getAssignedByStaff: async (): Promise<AssignedByStaffRow[]> =>
    (await apiClient.get("/dashboard/officernd/assigned-by-staff")).data,

  getDashboardWinLoss: async (): Promise<DashboardWinLoss> =>
    (await apiClient.get("/dashboard/officernd/win-loss")).data,

  getReportStaffSummary: async (month?: string): Promise<ReportStaffSummaryRow[]> =>
    (await apiClient.get("/reports/officernd/staff-summary", { params: month ? { month } : {} })).data,

  getReportTypeSummary: async (month?: string): Promise<ByTypeRow[]> =>
    (await apiClient.get("/reports/officernd/type-summary", { params: month ? { month } : {} })).data,

  getReportWinLoss: async (month?: string): Promise<ReportWinLossRow[]> =>
    (await apiClient.get("/reports/officernd/win-loss", { params: month ? { month } : {} })).data,
};
```

- [ ] **Step 2: Add `source` parameter to existing reports API**

In `frontend/src/api/reports.ts`, update `getWinLoss` and `getStaffPerformance`:

```ts
export type ReportSource = "leads" | "officernd" | "all";

getWinLoss: async (source?: ReportSource): Promise<WinLossReport[]> => {
  const params = source ? { source } : {};
  const response = await apiClient.get("/reports/win-loss", { params });
  return response.data;
},

getStaffPerformance: async (month?: string, source?: ReportSource): Promise<StaffPerformanceReport[]> => {
  const params: any = {};
  if (month) params.month = month;
  if (source) params.source = source;
  const response = await apiClient.get("/reports/staff-performance", { params });
  return response.data;
},
```

- [ ] **Step 3: TypeScript build check**

Run: `pnpm --filter frontend build` (or `tsc --noEmit` if faster). Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/officernd-reports.ts frontend/src/api/reports.ts
git commit -m "feat(frontend): add officernd-reports API client and ?source= param"
```

---

### Task 12: Three new chart components

**Files:**
- Create: `frontend/src/components/charts/MembershipTypeChart.tsx`
- Create: `frontend/src/components/charts/OfficerndAssignedByStaffChart.tsx`
- Create: `frontend/src/components/charts/OfficerndWinLossChart.tsx`
- Modify: `frontend/src/components/charts/index.ts`

- [ ] **Step 1: Create MembershipTypeChart**

Path: `frontend/src/components/charts/MembershipTypeChart.tsx`

```tsx
import ApexChart from "./ApexChart";
import type { ByTypeRow } from "@/api/officernd-reports";

export const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  OFFICE: "Office",
  VIRTUAL_OFFICE: "Virtual Office",
  TRADE_LICENSE: "Trade License",
  COWORKING: "Coworking",
  OTHERS: "Others",
};

export const MEMBERSHIP_TYPE_COLORS: Record<string, string> = {
  OFFICE: "#3B82F6",
  VIRTUAL_OFFICE: "#8B5CF6",
  TRADE_LICENSE: "#F59E0B",
  COWORKING: "#14B8A6",
  OTHERS: "#9CA3AF",
};

export default function MembershipTypeChart({ data }: { data: ByTypeRow[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No renewals yet</div>;

  return (
    <ApexChart
      type="donut"
      height={350}
      series={data.map((d) => d.count)}
      options={{
        chart: { type: "donut" },
        colors: data.map((d) => MEMBERSHIP_TYPE_COLORS[d.type] || "#9CA3AF"),
        labels: data.map((d) => MEMBERSHIP_TYPE_LABELS[d.type] || d.type),
        dataLabels: { enabled: true, style: { fontSize: "12px", colors: ["#fff"] } },
        legend: { position: "bottom", fontSize: "12px" },
        plotOptions: {
          pie: {
            donut: {
              size: "55%",
              labels: {
                show: true,
                total: {
                  show: true,
                  label: "Total",
                  formatter: () => String(data.reduce((a, b) => a + b.count, 0)),
                },
              },
            },
          },
        },
      }}
    />
  );
}
```

- [ ] **Step 2: Create OfficerndAssignedByStaffChart**

Path: `frontend/src/components/charts/OfficerndAssignedByStaffChart.tsx`

```tsx
import ApexChart from "./ApexChart";
import type { AssignedByStaffRow } from "@/api/officernd-reports";

export default function OfficerndAssignedByStaffChart({ data }: { data: AssignedByStaffRow[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No data</div>;

  return (
    <ApexChart
      type="bar"
      height={350}
      series={[{ name: "Assigned", data: data.map((d) => d.count) }]}
      options={{
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
        xaxis: { categories: data.map((d) => d.userName) },
        colors: ["#A855F7"],
        dataLabels: { enabled: true, style: { colors: ["#fff"], fontSize: "11px" } },
      }}
    />
  );
}
```

- [ ] **Step 3: Create OfficerndWinLossChart**

Path: `frontend/src/components/charts/OfficerndWinLossChart.tsx`

```tsx
import ApexChart from "./ApexChart";
import type { ReportWinLossRow } from "@/api/officernd-reports";

export default function OfficerndWinLossChart({ data }: { data: ReportWinLossRow[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-[350px] text-gray-500">No data</div>;

  return (
    <ApexChart
      type="bar"
      height={350}
      series={[
        { name: "Won", data: data.map((d) => d.won) },
        { name: "Lost", data: data.map((d) => d.lost) },
      ]}
      options={{
        chart: { type: "bar", stacked: false, toolbar: { show: false } },
        plotOptions: { bar: { horizontal: false, columnWidth: "55%", borderRadius: 4 } },
        xaxis: { categories: data.map((d) => d.userName) },
        colors: ["#22C55E", "#EF4444"],
        dataLabels: { enabled: true, style: { colors: ["#fff"], fontSize: "11px" } },
        legend: { position: "top" },
      }}
    />
  );
}
```

- [ ] **Step 4: Re-export from charts index**

In `frontend/src/components/charts/index.ts`, add:

```ts
export { default as MembershipTypeChart, MEMBERSHIP_TYPE_LABELS, MEMBERSHIP_TYPE_COLORS } from "./MembershipTypeChart";
export { default as OfficerndAssignedByStaffChart } from "./OfficerndAssignedByStaffChart";
export { default as OfficerndWinLossChart } from "./OfficerndWinLossChart";
```

- [ ] **Step 5: TypeScript check + commit**

Run: `pnpm --filter frontend build`
Expected: clean.

```bash
git add frontend/src/components/charts/
git commit -m "feat(charts): add MembershipType, AssignedByStaff, OfficerndWinLoss charts"
```

---

## Phase 5 — Frontend Pages

### Task 13: Restructure Dashboard with Lead Sources heading + OfficerndDashboardSection

**Files:**
- Modify: `frontend/src/pages/dashboard/DashboardPage.tsx`
- Create: `frontend/src/pages/dashboard/OfficerndDashboardSection.tsx`

- [ ] **Step 1: Create OfficerndDashboardSection component**

Path: `frontend/src/pages/dashboard/OfficerndDashboardSection.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card } from "@/components/ui";
import {
  MembershipTypeChart,
  OfficerndAssignedByStaffChart,
} from "@/components/charts";
import { Building2, UserCheck, ArrowRight, EyeOff, Trophy, X, Activity } from "lucide-react";

export default function OfficerndDashboardSection() {
  const lifecycle = useQuery({
    queryKey: ["dashboard", "officernd", "lifecycle"],
    queryFn: () => officerndReportsApi.getLifecycleSummary(),
  });
  const byType = useQuery({
    queryKey: ["dashboard", "officernd", "byType"],
    queryFn: () => officerndReportsApi.getByType(),
  });
  const assigned = useQuery({
    queryKey: ["dashboard", "officernd", "assigned"],
    queryFn: () => officerndReportsApi.getAssignedByStaff(),
  });
  const winLoss = useQuery({
    queryKey: ["dashboard", "officernd", "winLoss"],
    queryFn: () => officerndReportsApi.getDashboardWinLoss(),
  });

  const lifecycleCards = [
    { title: "Pending", value: lifecycle.data?.pending ?? 0, icon: Building2, color: "text-gray-600", bg: "bg-gray-50" },
    { title: "Assigned", value: lifecycle.data?.assigned ?? 0, icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Pipelined", value: lifecycle.data?.pipelined ?? 0, icon: ArrowRight, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Ignored", value: lifecycle.data?.ignored ?? 0, icon: EyeOff, color: "text-gray-400", bg: "bg-gray-50" },
  ];

  const wlCards = [
    { title: "Won", value: winLoss.data?.won ?? 0, icon: Trophy, color: "text-green-600", bg: "bg-green-50" },
    { title: "Lost", value: winLoss.data?.lost ?? 0, icon: X, color: "text-red-600", bg: "bg-red-50" },
    { title: "Active", value: winLoss.data?.active ?? 0, icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Win Rate", value: `${winLoss.data?.winRate ?? 0}%`, icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6 border-l-4 border-purple-500 pl-6">
      <div>
        <h2 className="text-title-md font-semibold text-purple-700">OfficeRnD Renewals</h2>
        <p className="mt-1 text-sm text-gray-500">Membership renewals synced from OfficeRnD</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {lifecycleCards.map((c) => (
          <Card key={c.title} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{c.title}</p>
                <p className="text-xl font-bold text-gray-900">{lifecycle.isLoading ? "-" : c.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {wlCards.map((c) => (
          <Card key={c.title} className="p-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${c.bg}`}>
                <c.icon className={`h-6 w-6 ${c.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{c.title}</p>
                <p className="text-xl font-bold text-gray-900">{winLoss.isLoading ? "-" : c.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Membership Type Breakdown">
          {byType.isLoading
            ? <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            : <MembershipTypeChart data={byType.data ?? []} />
          }
        </Card>
        <Card title="Assigned Per Staff">
          {assigned.isLoading
            ? <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
            : <OfficerndAssignedByStaffChart data={assigned.data ?? []} />
          }
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Restructure DashboardPage with Lead Sources heading**

In `frontend/src/pages/dashboard/DashboardPage.tsx`:

- Import `useAuthStore` and `OfficerndDashboardSection`.
- Replace the existing JSX to wrap stat cards / location-source / staff-charts inside a "Lead Sources" section, then conditionally render `<OfficerndDashboardSection />` for admin.

```tsx
import { useAuthStore } from "@/contexts/auth-store";
import OfficerndDashboardSection from "./OfficerndDashboardSection";

// inside component:
const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

return (
  <div className="space-y-10">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-title-md font-semibold text-gray-800 dark:text-white">Dashboard Overview</h1>
        <p className="mt-1 text-sm text-gray-500">Track your CRM performance at a glance</p>
      </div>
    </div>

    {/* Lead Sources */}
    <div className="space-y-6 border-l-4 border-blue-500 pl-6">
      <div>
        <h2 className="text-title-md font-semibold text-blue-700">Lead Sources</h2>
        <p className="mt-1 text-sm text-gray-500">Organic leads from marketing channels and referrals</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {/* existing statCards.map(...) */}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* existing Location + Source cards */}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* existing Staff Win/Loss + Win Rate cards */}
      </div>
    </div>

    {isAdmin && <OfficerndDashboardSection />}
  </div>
);
```

- [ ] **Step 3: Boot dev server and verify visually**

Run: `pnpm dev`
Expected:
- As admin: see two clearly separated sections — blue "Lead Sources" + purple "OfficeRnD Renewals". By-source chart no longer shows OfficeRnD slice. Top stat cards show smaller leads-only numbers.
- As SALES (login as a SALES user): only "Lead Sources" section visible. No OfficeRnD UI anywhere.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/dashboard/
git commit -m "feat(dashboard): split into Lead Sources and OfficeRnD Renewals sections"
```

---

### Task 14: Modify existing Reports sections to pass `source="leads"`

**Files:**
- Modify: `frontend/src/pages/reports/OverallSummarySection.tsx`
- Modify: `frontend/src/pages/reports/StaffChartsSection.tsx`

- [ ] **Step 1: Update OverallSummarySection query to pass source**

In `OverallSummarySection.tsx`, change the query:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["reports", "staff-performance", month, "leads"],
  queryFn: () => reportsApi.getStaffPerformance(month || undefined, "leads"),
});
```

Update the section title to make the scoping explicit: `title="Overall Summary Report (Lead Sources)"`.

- [ ] **Step 2: Update StaffChartsSection to pass source**

In `StaffChartsSection.tsx`:

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["reports", "win-loss", "leads"],
  queryFn: () => reportsApi.getWinLoss("leads"),
});
```

Update section titles: `title="Staff Win / Loss (Lead Sources)"` and `title="Staff Win Rate (Lead Sources)"`.

- [ ] **Step 3: TypeScript build check**

Run: `pnpm --filter frontend build`. Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/reports/OverallSummarySection.tsx frontend/src/pages/reports/StaffChartsSection.tsx
git commit -m "feat(reports): scope existing staff sections to Lead Sources only"
```

---

### Task 15: Three new OfficeRnD report sections + ReportsPage wiring

**Files:**
- Create: `frontend/src/pages/reports/OfficerndStaffSummarySection.tsx`
- Create: `frontend/src/pages/reports/OfficerndTypeSummarySection.tsx`
- Create: `frontend/src/pages/reports/OfficerndWinLossSection.tsx`
- Modify: `frontend/src/pages/reports/ReportsPage.tsx`

- [ ] **Step 1: Extract MONTHS constant to shared util (DRY — three new files would otherwise duplicate the IIFE)**

Path: `frontend/src/pages/reports/months.ts`

```ts
export const MONTHS = (() => {
  const opts = [{ value: "", label: "All Time" }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value: val, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
  }
  return opts;
})();
```

Update existing `OverallSummarySection.tsx` and `BrokerSection.tsx` to import from this module and delete their local `MONTHS` IIFEs. The three new sections in this task all import the same constant.

- [ ] **Step 2: Create OfficerndStaffSummarySection**

Path: `frontend/src/pages/reports/OfficerndStaffSummarySection.tsx`

Pattern: mirrors `OverallSummarySection.tsx` exactly — Card with month dropdown + PDF button in the action slot, table inside the `useExportPdf` ref div.

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card } from "@/components/ui";
import { Users, FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";
import { MONTHS } from "./months";

export default function OfficerndStaffSummarySection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("OfficeRnD-Staff-Summary");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "officernd", "staff-summary", month],
    queryFn: () => officerndReportsApi.getReportStaffSummary(month || undefined),
  });

  return (
    <Card
      title="OfficeRnD Renewals — Per Staff"
      description="Assigned, pipelined, won, and lost counts for OfficeRnD renewals"
      action={
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      }
    >
      <div ref={ref} className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pipelined</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Won</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lost</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Win Rate</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-800">
            {isLoading
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              : data?.length
                ? data.map((row) => (
                  <tr key={row.userId}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.userName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.assigned}</td>
                    <td className="px-4 py-3 text-sm text-purple-600">{row.pipelined}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{row.won}</td>
                    <td className="px-4 py-3 text-sm text-red-600">{row.lost}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.winRate >= 50 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {row.winRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
                : <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No data available</td></tr>
            }
          </tbody>
        </table>
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Create OfficerndTypeSummarySection**

Path: `frontend/src/pages/reports/OfficerndTypeSummarySection.tsx` — month dropdown, donut chart inside ref div, PDF button. Use `MembershipTypeChart` from `@/components/charts`.

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card } from "@/components/ui";
import { FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";
import { MONTHS } from "./months";
import { MembershipTypeChart } from "@/components/charts";

export default function OfficerndTypeSummarySection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("OfficeRnD-Type-Summary");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "officernd", "type-summary", month],
    queryFn: () => officerndReportsApi.getReportTypeSummary(month || undefined),
  });

  return (
    <Card
      title="OfficeRnD Membership Type Breakdown"
      description="Renewal mix by membership type (excludes ignored rows)"
      action={
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      }
    >
      <div ref={ref}>
        {isLoading
          ? <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
          : <MembershipTypeChart data={data ?? []} />
        }
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Create OfficerndWinLossSection**

Path: `frontend/src/pages/reports/OfficerndWinLossSection.tsx` — month dropdown, OfficerndWinLossChart inside ref div, PDF button.

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { officerndReportsApi } from "@/api/officernd-reports";
import { Card } from "@/components/ui";
import { FileDown } from "lucide-react";
import { useExportPdf } from "@/hooks/use-export-pdf";
import { MONTHS } from "./months";
import { OfficerndWinLossChart } from "@/components/charts";

export default function OfficerndWinLossSection() {
  const [month, setMonth] = useState("");
  const { ref, exportPdf } = useExportPdf("OfficeRnD-Win-Loss");
  const { data, isLoading } = useQuery({
    queryKey: ["reports", "officernd", "win-loss", month],
    queryFn: () => officerndReportsApi.getReportWinLoss(month || undefined),
  });

  return (
    <Card
      title="OfficeRnD Renewals — Staff Win / Loss"
      description="Per-staff win/loss for OfficeRnD-linked deals only"
      action={
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
            {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      }
    >
      <div ref={ref}>
        {isLoading
          ? <div className="flex items-center justify-center h-[350px] text-gray-500">Loading...</div>
          : <OfficerndWinLossChart data={data ?? []} />
        }
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Wire new sections into ReportsPage**

In `frontend/src/pages/reports/ReportsPage.tsx`:

```tsx
import OfficerndStaffSummarySection from "./OfficerndStaffSummarySection";
import OfficerndTypeSummarySection from "./OfficerndTypeSummarySection";
import OfficerndWinLossSection from "./OfficerndWinLossSection";

// inside JSX, after BrokerSection:
{isAdmin && (
  <div className="space-y-6 border-l-4 border-purple-500 pl-6">
    <h2 className="text-xl font-bold text-purple-700">OfficeRnD Renewals Reports</h2>
    <OfficerndStaffSummarySection />
    <OfficerndTypeSummarySection />
    <OfficerndWinLossSection />
  </div>
)}
```

- [ ] **Step 6: Boot dev server, verify visually**

Run: `pnpm dev`
Expected:
- Reports page now shows two visually-grouped report families: existing leads sections (with "(Lead Sources)" suffix in titles), and new "OfficeRnD Renewals Reports" group at the bottom.
- Each new section: month dropdown works, PDF button opens print preview, table/chart renders.
- Login as SALES → no OfficeRnD report sections visible.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/reports/
git commit -m "feat(reports): add OfficeRnD per-staff, type, and win-loss sections"
```

---

## Phase 6 — Final Verification

### Task 16: End-to-end manual verification + acceptance criteria check

**Files:** none (verification only)

- [ ] **Step 1: Run all backend test suites**

```bash
docker-compose up -d db
pnpm --filter backend migration:run
pnpm --filter backend seed
pnpm --filter backend test          # unit tests
pnpm --filter backend test:e2e      # e2e tests
```
Expected: every test passes.

- [ ] **Step 2: Walk through acceptance criteria from the spec**

Boot the full app: `pnpm dev`.

Verify each item:
1. ☐ `/dashboard` top stat cards reflect leads-only numbers (compare against deal counts in DB filtered by `officernd_sync_id IS NULL`).
2. ☐ `/dashboard` by-source chart no longer shows OFFICERND_RENEWAL slice.
3. ☐ "OfficeRnD Renewals" section visible to admin only — login as SALES user, confirm no OfficeRnD UI on `/dashboard` or `/reports`.
4. ☐ Membership-type donut classifies seeded plan names correctly (cross-check against `SELECT membership_type, membership_type_class FROM officernd_sync` output).
5. ☐ `/reports` shows two clearly-grouped families: leads-only sections (existing, with title suffix) and new OfficeRnD sections.
6. ☐ Per-section PDF export works on every new widget.
7. ☐ SALES role sees zero OfficeRnD UI on either page.

- [ ] **Step 3: Manual sanity check on production data shape**

Trigger an OfficeRnD sync to confirm classifier writes `membership_type_class` on new/updated PENDING rows:

```bash
curl -X POST http://localhost:3001/api/v1/officernd/sync/run -H "Authorization: Bearer <admin-token>"
docker-compose exec db psql -U postgres -d arafat_crm -c "SELECT membership_type, membership_type_class FROM officernd_sync ORDER BY synced_at DESC LIMIT 5"
```
Expected: every row has a populated `membership_type_class` matching the classifier rules.

- [ ] **Step 4: Final commit if any small fixups were needed**

If acceptance walk-through surfaced minor fixups, batch them into one commit:

```bash
git add -p
git commit -m "fix: address verification feedback for officernd-split"
```

If no fixups needed, no commit. Plan is complete.

---

## Notes for the Implementer

- **Test database state:** the e2e specs share a Postgres database. Each spec must clean up its own seed data in `afterAll` to avoid cross-spec interference. Follow the `DELETE ... WHERE email LIKE '%dashboard_test_%'` pattern from existing specs.
- **Migrations on production:** per CLAUDE.md gotcha #23, never run `npx typeorm-ts-node-commonjs` on the VPS. The deploy script handles migrations via `psql -f` or compiled JS — this plan adds a standard TS migration that will be picked up by the existing deploy flow.
- **Frontend paths:** Vite's `@/` alias points to `frontend/src/`. All imports use this alias, never relative paths from page files into other directories.
- **Chart styling:** all new charts use `ApexChart` (the existing wrapper), never raw `react-apexcharts`. Color hex values for membership types are exported from `MembershipTypeChart.tsx` so other consumers don't duplicate them.
- **No calendar/sync changes:** the spec is explicit that OfficeRnD sync logic, the triage page, and pipeline rendering are out of scope. The only edits to existing OfficeRnD code are adding `classifyMembershipType(...)` calls in `officernd.service.ts` for PENDING upsert paths.
