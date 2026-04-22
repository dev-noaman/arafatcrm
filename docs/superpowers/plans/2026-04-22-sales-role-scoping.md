# Sales Role Scoping Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restrict Sales users to see only their own deals, clients, and personal dashboard/report data. Admin retains full access.

**Architecture:** Service-layer filtering — each backend service checks `user.role` and applies ownership `WHERE` clauses when the role is `SALES`. Controllers inject `@User()` to pass user context. Frontend hides admin-only UI and adds route guards.

**Tech Stack:** NestJS (TypeORM, Guards), React 18 (Zustand auth store, TanStack Query)

---

### Task 1: Backend — Scope Deals controller & service

**Files:**
- Modify: `backend/src/deals/deals.controller.ts` (inject `@User()` on findAll/findOne/findByClient/findByBroker, add `@Roles(ADMIN)` on findByOwner)
- Modify: `backend/src/deals/deals.service.ts` (add userId/userRole params + SALES filters)

- [ ] **Step 1: Update deals controller — inject @User() on read endpoints**

In `backend/src/deals/deals.controller.ts`, update `findAll`, `findOne`, `findByClient`, `findByBroker` to pass user, and restrict `findByOwner`:

```typescript
// Line 36-40: findAll — add @User()
@Get()
@ApiOperation({ summary: "List all deals with pagination and filters" })
findAll(@Query() pagination: PaginationQueryDto, @User() user: any) {
  return this.dealsService.findAll(pagination, { status: pagination.status, stage: pagination.stage }, user.id, user.role);
}

// Line 42-46: findOne — add @User()
@Get(":id")
@ApiOperation({ summary: "Get deal by ID" })
findOne(@Param("id", ParseUUIDPipe) id: string, @User() user: any) {
  return this.dealsService.findOne(id, user.id, user.role);
}

// Line 71-75: findByClient — add @User()
@Get("client/:clientId")
@ApiOperation({ summary: "Find deals by client" })
findByClient(@Param("clientId", ParseUUIDPipe) clientId: string, @User() user: any) {
  return this.dealsService.findByClient(clientId, user.id, user.role);
}

// Line 77-81: findByBroker — add @User()
@Get("broker/:brokerId")
@ApiOperation({ summary: "Find deals by broker" })
findByBroker(@Param("brokerId", ParseUUIDPipe) brokerId: string, @User() user: any) {
  return this.dealsService.findByBroker(brokerId, user.id, user.role);
}
```

Add `Roles` and `Role` imports at top (note: `User` is already imported from `"../common/decorators"` on line 22):
```typescript
import { User, Roles } from "../common/decorators";
import { Role } from "@arafat/shared";
```

Restrict `findByOwner` to admin:
```typescript
// Line 83-90: findByOwner — admin only
@Get("owner/:ownerId")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Find deals by owner" })
findByOwner(
  @Param("ownerId", ParseUUIDPipe) ownerId: string,
  @Query() pagination?: PaginationQueryDto,
) {
  return this.dealsService.findByOwner(ownerId, pagination);
}
```

- [ ] **Step 2: Update deals service — add SALES filtering**

In `backend/src/deals/deals.service.ts`:

Update `findAll` signature and add SALES filter:
```typescript
async findAll(
  pagination: PaginationQueryDto,
  filters?: { status?: string; stage?: string },
  userId?: string,
  userRole?: string,
) {
  const { page, limit } = pagination;
  const where: any = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.stage) where.stage = filters.stage;

  // SALES users see only their own deals
  if (userRole === "SALES" && userId) {
    where.owner = { id: userId };
  }

  const [data, total] = await this.dealsRepo.findAndCount({
    where,
    relations: ["client", "broker", "owner"],
    order: { createdAt: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { data, total, page, limit };
}
```

Update `findOne` to accept user context and enforce ownership:
```typescript
async findOne(id: string, userId?: string, userRole?: string) {
  const deal = await this.dealsRepo.findOne({
    where: { id },
    relations: ["client", "broker", "owner"],
  });

  if (!deal) {
    throw new NotFoundException(`Deal with ID ${id} not found`);
  }

  // SALES users can only see their own deals
  if (userRole === "SALES" && userId && deal.owner?.id !== userId) {
    throw new NotFoundException(`Deal with ID ${id} not found`);
  }

  return deal;
}
```

Update `findByClient` and `findByBroker`:
```typescript
async findByClient(clientId: string, userId?: string, userRole?: string) {
  const where: any = { client: { id: clientId } };
  if (userRole === "SALES" && userId) {
    where.owner = { id: userId };
  }
  return this.dealsRepo.find({
    where,
    relations: ["client", "broker", "owner"],
    order: { createdAt: "DESC" },
  });
}

async findByBroker(brokerId: string, userId?: string, userRole?: string) {
  const where: any = { broker: { id: brokerId } };
  if (userRole === "SALES" && userId) {
    where.owner = { id: userId };
  }
  return this.dealsRepo.find({
    where,
    relations: ["client", "broker", "owner"],
    order: { createdAt: "DESC" },
  });
}
```

Note: `update`, `markAsLost`, `remove` already call `findOne` internally — but they call it without user context. Update these to pass user context:
```typescript
async update(id: string, dto: UpdateDealDto, userId: string, userRole: string) {
  const deal = await this.findOne(id, userId, userRole);
  // ... rest unchanged (already has owner check)
```

```typescript
async markAsLost(id: string, reason: string, userId: string, userRole: string) {
  const deal = await this.findOne(id, userId, userRole);
  // ... rest unchanged
```

```typescript
async remove(id: string, userId: string, userRole: string) {
  const deal = await this.findOne(id, userId, userRole);
  // ... rest unchanged
```

- [ ] **Step 3: Build and verify**

Run: `cd D:/Copy/ArafatCrm && pnpm --filter backend build`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add backend/src/deals/deals.controller.ts backend/src/deals/deals.service.ts
git commit -m "feat(deals): add SALES role scoping — users see only their own deals"
```

---

### Task 2: Backend — Clients migration + entity + service scoping

**Files:**
- Create: `backend/src/db/migrations/1745280000000-AddCreatedByToClients.ts`
- Modify: `backend/src/clients/client.entity.ts` (add `createdBy` relation)
- Modify: `backend/src/clients/clients.controller.ts` (inject `@User()`, add `@Roles(ADMIN)` on update/remove)
- Modify: `backend/src/clients/clients.service.ts` (SALES filtering, ownership checks)

- [ ] **Step 1: Create migration for clients.created_by column**

Create `backend/src/db/migrations/1745280000000-AddCreatedByToClients.ts`:

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCreatedByToClients1745280000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "clients",
      new TableColumn({
        name: "created_by",
        type: "uuid",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("clients", "created_by");
  }
}
```

- [ ] **Step 2: Update client entity — add createdBy relation**

In `backend/src/clients/client.entity.ts`, add after the `assignedTo` relation (line 31):

```typescript
@Column({ name: "created_by", nullable: true, type: "uuid" })
createdById: string | null = null;

@ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: "created_by" })
createdBy!: User | null;
```

- [ ] **Step 3: Update clients controller — inject @User(), restrict mutations**

In `backend/src/clients/clients.controller.ts`, add imports:
```typescript
import { User as UserDecorator, Roles } from "../common/decorators";
import { Role } from "@arafat/shared";
```

Update each endpoint:
```typescript
@Post()
@ApiOperation({ summary: "Create a new client" })
create(@Body() dto: CreateClientDto, @UserDecorator() user: any) {
  return this.clientsService.create(dto, user.id);
}

@Post("bulk")
@ApiOperation({ summary: "Bulk create clients" })
bulkCreate(@Body() dtos: CreateClientDto[], @UserDecorator() user: any) {
  return this.clientsService.bulkCreate(dtos, user.id);
}

@Get()
@ApiOperation({ summary: "List all clients with pagination" })
findAll(@Query() pagination: PaginationQueryDto, @UserDecorator() user: any) {
  return this.clientsService.findAll(pagination, user.id, user.role);
}

@Get(":id")
@ApiOperation({ summary: "Get client by ID" })
findOne(@Param("id", ParseUUIDPipe) id: string, @UserDecorator() user: any) {
  return this.clientsService.findOne(id, user.id, user.role);
}

@Put(":id")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Update client" })
update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
  return this.clientsService.update(id, dto);
}

@Delete(":id")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Delete client" })
remove(@Param("id", ParseUUIDPipe) id: string) {
  return this.clientsService.remove(id);
}
```

- [ ] **Step 4: Update clients service — add SALES filtering + ownership**

In `backend/src/clients/clients.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
```

Update `create`:
```typescript
async create(dto: CreateClientDto, userId: string) {
  try {
    const client = this.clientsRepo.create({ ...dto, createdBy: { id: userId } as any });
    return await this.clientsRepo.save(client);
  } catch (error: any) {
    if (error.code === "23505") {
      throw new ConflictException("Client with this email already exists");
    }
    throw error;
  }
}
```

Update `bulkCreate`:
```typescript
async bulkCreate(dtos: CreateClientDto[], userId: string) {
  const results = { created: 0, errors: [] as { row: number; message: string }[] };
  for (let i = 0; i < dtos.length; i++) {
    try {
      const client = this.clientsRepo.create({ ...dtos[i], createdBy: { id: userId } as any });
      await this.clientsRepo.save(client);
      results.created++;
    } catch (error: any) {
      results.errors.push({ row: i + 1, message: error.code === "23505" ? "Email already exists" : error.message });
    }
  }
  return results;
}
```

Update `findAll` — use QueryBuilder for SALES to include unassigned legacy clients (`created_by IS NULL`):
```typescript
async findAll(pagination: PaginationQueryDto, userId?: string, userRole?: string) {
  const { page, limit } = pagination;

  if (userRole === "SALES" && userId) {
    // SALES sees their own clients + unassigned legacy clients (created_by IS NULL)
    const qb = this.clientsRepo.createQueryBuilder("client")
      .leftJoinAndSelect("client.assignedTo", "assignedTo")
      .leftJoinAndSelect("client.createdBy", "createdBy")
      .where("client.created_by = :userId OR client.created_by IS NULL", { userId })
      .orderBy("client.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ADMIN — no filter
  const [data, total] = await this.clientsRepo.findAndCount({
    relations: ["assignedTo", "createdBy"],
    order: { createdAt: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { data, total, page, limit };
}
```

Update `findOne` — SALES can read their own + unassigned legacy clients:
```typescript
async findOne(id: string, userId?: string, userRole?: string) {
  const client = await this.clientsRepo.findOne({
    where: { id },
    relations: ["assignedTo", "createdBy"],
  });

  if (!client) {
    throw new NotFoundException(`Client with ID ${id} not found`);
  }

  // SALES users can see their own clients + unassigned legacy clients
  if (userRole === "SALES" && userId && client.createdBy?.id !== userId && client.createdById !== null) {
    throw new NotFoundException(`Client with ID ${id} not found`);
  }

  return client;
}
```

- [ ] **Step 5: Run migration**

```bash
cd D:/Copy/ArafatCrm && pnpm --filter backend migration:run
```

- [ ] **Step 6: Build and verify**

Run: `cd D:/Copy/ArafatCrm && pnpm --filter backend build`
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add backend/src/clients/ backend/src/db/migrations/1745280000000-AddCreatedByToClients.ts
git commit -m "feat(clients): add created_by column + SALES role scoping"
```

---

### Task 3: Backend — Scope Brokers controller

**Files:**
- Modify: `backend/src/brokers/brokers.controller.ts` (add `@Roles(ADMIN)` on update/remove/document mutations)

- [ ] **Step 1: Add role restrictions to broker mutations**

In `backend/src/brokers/brokers.controller.ts`, add imports:
```typescript
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "@arafat/shared";
```

Add decorators:
```typescript
@Put(":id")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Update broker" })
// ... unchanged

@Delete(":id")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Delete broker" })
// ... unchanged

@Post(":id/documents")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Upload a document for a broker" })
// ... unchanged

@Delete(":id/documents/:documentId")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Delete a broker document" })
// ... unchanged
```

`findAll`, `findOne`, `create`, `bulkCreate`, and `downloadDocument` stay open to all authenticated users.

- [ ] **Step 2: Build and verify**

Run: `cd D:/Copy/ArafatCrm && pnpm --filter backend build`

- [ ] **Step 3: Commit**

```bash
git add backend/src/brokers/brokers.controller.ts
git commit -m "feat(brokers): restrict update/delete/document mutations to ADMIN role"
```

---

### Task 4: Backend — Scope Dashboard

**Files:**
- Modify: `backend/src/dashboard/dashboard.controller.ts` (inject `@User()`)
- Modify: `backend/src/dashboard/dashboard.service.ts` (SALES filtering on all queries)

- [ ] **Step 1: Update dashboard controller — inject @User()**

In `backend/src/dashboard/dashboard.controller.ts`, add import:
```typescript
import { User } from "../common/decorators";
```

Update each endpoint:
```typescript
@Get("stats")
@ApiOperation({ summary: "Get dashboard statistics" })
getStats(@User() user: any) {
  return this.dashboardService.getStats(user.id, user.role);
}

@Get("revenue-timeseries")
@ApiOperation({ summary: "Get revenue timeseries data" })
getRevenueTimeseries(@Query("days") days?: number, @User() user?: any) {
  return this.dashboardService.getRevenueTimeseries(days || 30, user?.id, user?.role);
}

@Get("by-location")
@ApiOperation({ summary: "Get deals grouped by location" })
getByLocation(@User() user: any) {
  return this.dashboardService.getByLocation(user.id, user.role);
}

@Get("by-source")
@ApiOperation({ summary: "Get deals grouped by client source" })
getBySource(@User() user: any) {
  return this.dashboardService.getBySource(user.id, user.role);
}
```

- [ ] **Step 2: Update dashboard service — add SALES filtering**

In `backend/src/dashboard/dashboard.service.ts`, update each method:

```typescript
async getStats(userId?: string, userRole?: string): Promise<DashboardStatsDto> {
  const salesFilter = userRole === "SALES" && userId;

  const [totalClients, totalBrokers, totalDeals, activeDeals] = await Promise.all([
    salesFilter
      ? this.clientsRepo.createQueryBuilder("c")
          .where("c.created_by = :uid OR c.created_by IS NULL", { uid: userId })
          .getCount()
      : this.clientsRepo.count(),
    this.brokersRepo.count(),
    salesFilter
      ? this.dealsRepo.count({ where: { owner: { id: userId } } })
      : this.dealsRepo.count(),
    salesFilter
      ? this.dealsRepo.count({ where: { status: "active", isLost: false, owner: { id: userId } } })
      : this.dealsRepo.count({ where: { status: "active", isLost: false } }),
  ]);

  const wonQb = this.dealsRepo.createQueryBuilder("deal")
    .where("deal.status = :status OR deal.stage = :stage", { status: "won", stage: "WON" });
  if (salesFilter) wonQb.andWhere("deal.owner_id = :uid", { uid: userId });
  const wonDeals = await wonQb.getMany();

  const lostQb = this.dealsRepo.createQueryBuilder("deal")
    .where("deal.status = :status OR deal.stage = :stage", { status: "lost", stage: "LOST" });
  if (salesFilter) lostQb.andWhere("deal.owner_id = :uid", { uid: userId });
  const lostDeals = await lostQb.getMany();

  const totalRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.commissionAmount || 0), 0);
  const conversionRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

  return {
    totalDeals,
    wonDeals: wonDeals.length,
    lostDeals: lostDeals.length,
    revenueQar: totalRevenue.toFixed(2),
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}
```

```typescript
async getRevenueTimeseries(days: number = 30, userId?: string, userRole?: string): Promise<RevenueTimeseriesPointDto[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const qb = this.dealsRepo.createQueryBuilder("deal")
    .where("deal.createdAt BETWEEN :start AND :end", { start: startDate, end: endDate })
    .andWhere("(deal.status = :status OR deal.stage = :stage)", { status: "won", stage: "WON" })
    .orderBy("deal.createdAt", "ASC");

  if (userRole === "SALES" && userId) {
    qb.andWhere("deal.owner_id = :uid", { uid: userId });
  }

  const deals = await qb.getMany();
  // ... rest of grouping logic unchanged
```

```typescript
async getByLocation(userId?: string, userRole?: string): Promise<ByLocationReportDto[]> {
  const qb = this.dealsRepo.createQueryBuilder("deal")
    .select("deal.location", "location")
    .addSelect("COUNT(deal.id)", "count")
    .addSelect("SUM(CASE WHEN deal.status = 'won' OR deal.stage = 'WON' THEN 1 ELSE 0 END)", "wonCount")
    .addSelect("SUM(CASE WHEN deal.status = 'lost' OR deal.stage = 'LOST' THEN 1 ELSE 0 END)", "lostCount")
    .where("deal.isLost = :isLost OR deal.status != :activeStatus", { isLost: false, activeStatus: "active" });

  if (userRole === "SALES" && userId) {
    qb.andWhere("deal.owner_id = :uid", { uid: userId });
  }

  const deals = await qb.groupBy("deal.location").getRawMany();
  return deals.map((d) => ({
    location: d.location,
    won: parseInt(d.wonCount, 10) || 0,
    lost: parseInt(d.lostCount, 10) || 0,
  }));
}
```

```typescript
async getBySource(userId?: string, userRole?: string): Promise<BySourceReportDto[]> {
  const qb = this.dealsRepo.createQueryBuilder("deal")
    .innerJoin("deal.client", "client")
    .select("client.source", "source")
    .addSelect("COUNT(deal.id)", "count")
    .addSelect("SUM(CASE WHEN deal.status = 'won' OR deal.stage = 'WON' THEN 1 ELSE 0 END)", "wonCount")
    .addSelect("SUM(CASE WHEN deal.status = 'lost' OR deal.stage = 'LOST' THEN 1 ELSE 0 END)", "lostCount")
    .where("deal.isLost = :isLost OR deal.status != :activeStatus", { isLost: false, activeStatus: "active" });

  if (userRole === "SALES" && userId) {
    qb.andWhere("deal.owner_id = :uid", { uid: userId });
  }

  const deals = await qb.groupBy("client.source").getRawMany();
  return deals.map((d) => ({
    source: d.source,
    won: parseInt(d.wonCount, 10) || 0,
    lost: parseInt(d.lostCount, 10) || 0,
  }));
}
```

- [ ] **Step 3: Build and verify**

Run: `cd D:/Copy/ArafatCrm && pnpm --filter backend build`

- [ ] **Step 4: Commit**

```bash
git add backend/src/dashboard/dashboard.controller.ts backend/src/dashboard/dashboard.service.ts
git commit -m "feat(dashboard): add SALES role scoping — personal stats only"
```

---

### Task 5: Backend — Scope Reports

**Files:**
- Modify: `backend/src/reports/reports.controller.ts` (add `@User()` on non-admin endpoints, `@Roles(ADMIN)` on staff performance)
- Modify: `backend/src/reports/reports.service.ts` (SALES filtering on all report queries)

- [ ] **Step 1: Update reports controller**

In `backend/src/reports/reports.controller.ts`, add import:
```typescript
import { User } from "../common/decorators";
```

```typescript
@Get("win-loss")
@ApiOperation({ summary: "Get win/loss report by user" })
getWinLossReport(@User() user: any) {
  return this.reportsService.getWinLossReport(user.id, user.role);
}

@Get("pipeline")
@ApiOperation({ summary: "Get deal pipeline grouped by stage" })
getDealPipeline(@User() user: any) {
  return this.reportsService.getDealPipeline(user.id, user.role);
}

@Get("broker-performance")
@ApiOperation({ summary: "Get broker performance report" })
getBrokerPerformance(@Query("month") month?: string, @User() user?: any) {
  return this.reportsService.getBrokerPerformance(month, user?.id, user?.role);
}

@Get("space-type-breakdown")
@ApiOperation({ summary: "Get deal breakdown by space type" })
getSpaceTypeBreakdown(@Query("month") month?: string, @User() user?: any) {
  return this.reportsService.getSpaceTypeBreakdown(month, user?.id, user?.role);
}

@Get("staff-performance")
@Roles(Role.ADMIN)
@ApiOperation({ summary: "Get monthly staff performance report (admin only)" })
getStaffPerformance(@Query("month") month?: string) {
  return this.reportsService.getStaffPerformance(month);
}
```

- [ ] **Step 2: Update reports service — SALES filtering**

In `backend/src/reports/reports.service.ts`, update each method:

```typescript
async getWinLossReport(userId?: string, userRole?: string) {
  const users = await this.usersRepo.find();
  const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));

  const findOptions: any = { relations: ["owner"] };
  if (userRole === "SALES" && userId) {
    findOptions.where = { owner: { id: userId } };
  }
  const allDeals = await this.dealsRepo.find(findOptions);

  // ... rest unchanged (grouping logic stays the same, just filters data first)
```

```typescript
async getDealPipeline(userId?: string, userRole?: string) {
  const findOptions: any = {
    where: { isLost: false },
    relations: ["client", "broker", "owner"],
    order: { stage: "ASC" },
  };
  if (userRole === "SALES" && userId) {
    findOptions.where = { isLost: false, owner: { id: userId } };
  }
  const deals = await this.dealsRepo.find(findOptions);
  // ... rest unchanged
```

```typescript
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

  const findOptions: any = { relations: ["broker"] };
  if (Object.keys(dateFilter).length > 0) {
    findOptions.where = { ...dateFilter };
  }
  if (userRole === "SALES" && userId) {
    findOptions.where = { ...(findOptions.where || {}), owner: { id: userId } };
  }

  const deals = await this.dealsRepo.find(findOptions);
  // ... rest unchanged
```

```typescript
async getSpaceTypeBreakdown(month?: string, userId?: string, userRole?: string) {
  let dateFilter: any = {};
  if (month) {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);
    dateFilter = { createdAt: Between(start, end) };
  }

  const findOptions: any = {};
  if (Object.keys(dateFilter).length > 0) {
    findOptions.where = { ...dateFilter };
  }
  if (userRole === "SALES" && userId) {
    findOptions.where = { ...(findOptions.where || {}), owner: { id: userId } };
  }

  const deals = await this.dealsRepo.find(findOptions);
  // ... rest unchanged
```

- [ ] **Step 3: Build and verify**

Run: `cd D:/Copy/ArafatCrm && pnpm --filter backend build`

- [ ] **Step 4: Commit**

```bash
git add backend/src/reports/reports.controller.ts backend/src/reports/reports.service.ts
git commit -m "feat(reports): add SALES role scoping — personal reports only"
```

---

### Task 6: Frontend — RequireRole component + route guard

**Files:**
- Create: `frontend/src/components/RequireRole.tsx`
- Modify: `frontend/src/App.tsx` (wrap `/users` route)

- [ ] **Step 1: Create RequireRole component**

Create `frontend/src/components/RequireRole.tsx`:

```tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/contexts/auth-store";

export default function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user?.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 2: Wrap admin routes in App.tsx**

In `frontend/src/App.tsx`, add import and wrap the `/users` route:

```tsx
import RequireRole from "@/components/RequireRole";

// In the routes, change:
<Route path="users" element={<UsersPage />} />
// To:
<Route path="users" element={<RequireRole role="ADMIN"><UsersPage /></RequireRole>} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/RequireRole.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add RequireRole route guard for admin-only pages"
```

---

### Task 7: Frontend — DealsPage & PipelinePage SALES adaptations

**Files:**
- Modify: `frontend/src/pages/deals/DealsPage.tsx` (SALES users skip owner dropdown)
- Modify: `frontend/src/pages/deals/PipelinePage.tsx` (SALES users skip owner assignment in deal modal)

- [ ] **Step 1: DealsPage — SALES already skips owner dropdown**

The `CreateDealModal` in `DealsPage.tsx` already has:
```tsx
const isAdmin = currentUser?.role === "ADMIN";
// ...
{isAdmin && (
  <Select label="Assign To" ... />
)}
```

And the submit already does:
```tsx
ownerId: isAdmin && formData.ownerId ? formData.ownerId : undefined,
```

No changes needed — the backend will auto-assign the SALES user as owner.

- [ ] **Step 2: Check PipelinePage deal modal for owner assignment**

The `DealDetailModal` in `PipelinePage.tsx` should conditionally show the owner dropdown based on role. Check if it already has `isAdmin` logic. If it calls `usersApi.findAll()`, ensure it's gated behind `enabled: isAdmin`.

Add check: in the `DealDetailModal` component, if there's a `users` query, gate it:
```tsx
const currentUser = useAuthStore((s) => s.user);
const isAdmin = currentUser?.role === "ADMIN";

const { data: users } = useQuery({
  queryKey: ["users", "all"],
  queryFn: () => usersApi.findAll(),
  enabled: isAdmin,
});
```

And in the modal form, conditionally render the owner dropdown:
```tsx
{isAdmin && users && (
  <Select label="Sales Rep" ... />
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/deals/
git commit -m "feat(frontend): gate owner assignment UI behind admin role check"
```

---

### Task 8: Frontend — ClientsPage SALES adaptations

**Files:**
- Modify: `frontend/src/pages/clients/ClientsPage.tsx` (hide delete for SALES, hide assign-to for SALES)

- [ ] **Step 1: ClientsPage — hide delete button for SALES, hide assign-to for SALES**

In `ClientsPage.tsx`, the `CreateClientModal` already has:
```tsx
const isAdmin = currentUser?.role === "ADMIN";
// ...
{isAdmin && users && (
  <Select label="Assign To" ... />
)}
```

The `actions` function shows delete for everyone. Wrap delete behind admin check:
```tsx
const actions = (client: Client) => (
  <div className="flex justify-end gap-2">
    <Button variant="ghost" size="sm" onClick={() => setViewClient(client)}>
      <Eye className="h-4 w-4" />
    </Button>
    {isAdmin && (
      <>
        <Button variant="ghost" size="sm" onClick={() => setEditClient(client)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm(`Delete client ${client.name}?`)) {
              deleteMutation.mutate(client.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </>
    )}
  </div>
);
```

Add at the top of the component:
```tsx
const currentUser = useAuthStore((s) => s.user);
const isAdmin = currentUser?.role === "ADMIN";
```

Note: backend already returns 403 for SALES on update/delete, but hiding the buttons prevents confusion.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/clients/ClientsPage.tsx
git commit -m "feat(frontend): hide client edit/delete buttons for SALES role"
```

---

### Task 9: Frontend — BrokersPage SALES adaptations

**Files:**
- Modify: `frontend/src/pages/brokers/BrokersPage.tsx` (hide edit/delete/document buttons for SALES)

- [ ] **Step 1: BrokersPage — hide edit/delete/upload UI for SALES**

In `frontend/src/pages/brokers/BrokersPage.tsx`, add role check at the top of the component:

```tsx
import { useAuthStore } from "@/contexts/auth-store";

// Inside the component:
const currentUser = useAuthStore((s) => s.user);
const isAdmin = currentUser?.role === "ADMIN";
```

In the `actions` function, wrap edit/delete behind `isAdmin`:
```tsx
const actions = (broker: Broker) => (
  <div className="flex justify-end gap-2">
    <Button variant="ghost" size="sm" onClick={() => setViewBroker(broker)}>
      <Eye className="h-4 w-4" />
    </Button>
    {isAdmin && (
      <>
        <Button variant="ghost" size="sm" onClick={() => setEditBroker(broker)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(broker)}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </>
    )}
  </div>
);
```

In the broker detail/view modal, hide document upload/delete buttons for SALES:
```tsx
{isAdmin && (
  <button onClick={() => handleUploadDocument(broker.id)}>Upload Document</button>
)}
{isAdmin && document && (
  <button onClick={() => handleDeleteDocument(broker.id, document.id)}>Delete</button>
)}
```

Note: Download stays visible to all users. Backend `@Roles(ADMIN)` already blocks mutations.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/brokers/BrokersPage.tsx
git commit -m "feat(frontend): hide broker edit/delete/upload UI for SALES role"
```

---

### Task 10: Build verification + manual testing

- [ ] **Step 1: Full backend build**

Run: `cd D:/Copy/ArafatCrm && pnpm --filter backend build`
Expected: no errors

- [ ] **Step 2: Full frontend build**

Run: `cd D:/Copy/ArafatCrm && pnpm --filter frontend build`
Expected: no errors

- [ ] **Step 3: Run migration**

```bash
cd D:/Copy/ArafatCrm && pnpm --filter backend migration:run
```

- [ ] **Step 4: Manual testing checklist**

Login as Sales user and verify:
1. Dashboard: shows only personal stats
2. Deals: shows only own deals
3. Pipeline: shows only own deal cards
4. Clients: shows only own clients (created_by = user), can create new, cannot edit/delete
5. Brokers: can view all, can create, cannot edit/delete/upload documents, can download documents
6. Reports: sees personal reports (filtered data), no Overall Summary or Staff Charts
7. Users page: redirected to dashboard
8. Login as Admin — everything works as before (no regression)
