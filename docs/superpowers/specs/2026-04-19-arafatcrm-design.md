# ArafatCRM — Design Spec

**Date:** 2026-04-19
**Status:** Draft (pending user review)
**Source prompt:** `prompt.md` at repo root

A production-ready Sales CRM web app for Arafat Business Center, which rents Workstations and Office Spaces across three locations (Barwa Alsadd, Element Westbay, Marina50 Lusail). This document is the authoritative design — the implementation plan will be written from it.

---

## 1. Goals and non-goals

**Goals**

- Let sales reps track deals through a 6-stage pipeline plus two terminal outcomes (Won/Lost).
- Surface a shared view of clients, brokers, and reference data; keep each rep's deal pipeline private.
- Give admins an at-a-glance dashboard and a reports page with win/loss, revenue, and segmentation charts.
- Ship as a self-contained `docker compose up` application with seeded demo data.

**Non-goals (v1)**

- Multi-tenancy / multi-company support. Single company.
- Multi-currency. Column retained; UI and logic are QAR-only.
- Soft delete / audit of non-stage changes. Only `deal_stage_history` is recorded.
- Real-time collaboration (websockets, live kanban). Plain HTTP with polling/invalidation.
- Mobile-first UX. Desktop-first, responsive down to tablet (≥ 768px).
- CI/CD pipelines. Delivery bar is "runs locally from a clean clone."

---

## 2. Tech stack

Mandated by the source prompt; locked in here.

| Layer | Choice |
|---|---|
| Backend | NestJS (TypeScript), REST, feature modules per entity |
| Database | PostgreSQL 15+ with **TypeORM** |
| Frontend | React 18 + Vite + TypeScript + TailwindCSS, TailAdmin Pro as base |
| Validation | backend: `class-validator` / `class-transformer`; frontend: React Hook Form + Zod |
| Auth | JWT (email + password), bcrypt-hashed passwords |
| API docs | Swagger at `/api/docs` |
| Migrations | TypeORM migrations; no auto-sync in any environment |
| Monorepo | **pnpm workspaces** with a shared types package |
| Delivery | `docker-compose.yml` with `postgres`, `backend`, `frontend` |

Additional frontend libraries (chosen, not mandated): TanStack Query, React Router v6, React Hook Form, Zod, @dnd-kit/core (kanban DnD), Recharts (reports), sonner (toasts).

---

## 3. Repo layout

```
ArafatCrm/
├─ pnpm-workspace.yaml
├─ docker-compose.yml
├─ .env.example
├─ README.md
├─ backend/
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ Dockerfile
│  ├─ data-source.ts               # TypeORM DataSource (migrations + runtime)
│  ├─ src/
│  │  ├─ main.ts                   # Nest bootstrap, Swagger, global pipes + filter
│  │  ├─ app.module.ts
│  │  ├─ common/
│  │  │  ├─ filters/http-exception.filter.ts
│  │  │  ├─ pipes/pagination.pipe.ts
│  │  │  ├─ decorators/current-user.decorator.ts
│  │  │  ├─ decorators/public.decorator.ts
│  │  │  ├─ decorators/roles.decorator.ts
│  │  │  ├─ guards/jwt-auth.guard.ts
│  │  │  └─ guards/roles.guard.ts
│  │  ├─ auth/                     # login, register, me, JWT strategy, bcrypt
│  │  ├─ users/
│  │  ├─ clients/
│  │  ├─ brokers/
│  │  ├─ deals/                    # deals + stage history + reopen + reassign
│  │  ├─ dashboard/
│  │  └─ reports/
│  ├─ migrations/
│  ├─ seed/
│  └─ test/                        # e2e specs
├─ frontend/
│  ├─ package.json
│  ├─ Dockerfile
│  ├─ vite.config.ts
│  ├─ tailwind.config.ts           # design tokens + TailAdmin overrides
│  └─ src/
│     ├─ main.tsx, App.tsx, router.tsx
│     ├─ lib/api/                  # typed fetch client, hooks
│     ├─ lib/auth/                 # AuthContext, ProtectedRoute
│     ├─ lib/validation/           # Zod schemas
│     ├─ components/               # primitives, composed, feature
│     ├─ layouts/AppLayout.tsx
│     └─ pages/                    # Login, Dashboard, Pipeline, Deals, DealDetail, Clients, Brokers, Reports, Users
└─ packages/
   └─ shared/
      ├─ package.json
      └─ src/
         ├─ index.ts
         ├─ enums.ts               # Role, Source, Stage, Location, SpaceType, Currency
         └─ dto/                   # ClientDto, BrokerDto, DealDto, DealStageHistoryDto, DashboardStatsDto, ...
```

`packages/shared` exports pure TypeScript types (enums + interfaces). Backend DTOs extend or re-export these and add `class-validator` decorators. Frontend imports them directly into API hooks and Zod schemas so field shapes never drift.

---

## 4. Runtime, deployment, and environment

### 4.1 docker-compose services

- `postgres`: `postgres:15`, named volume, healthcheck on `pg_isready`, exposes 5432 internally only.
- `backend`: builds from `backend/Dockerfile`. Waits on postgres health, runs `typeorm migration:run`, then `node dist/main.js`. Exposes `BACKEND_PORT` (default 3000).
- `frontend`: multi-stage build — Vite `build` stage, then `nginx:alpine` serving the static output with a minimal `nginx.conf` that proxies `/api` to `backend`. Exposes `FRONTEND_PORT` (default 5173).

### 4.2 Dev workflow

- `pnpm install` at root.
- `pnpm dev` runs backend (`nest start --watch`) and frontend (`vite`) concurrently; Postgres is the docker-compose service.
- Tests: `pnpm --filter backend test` (unit) and `pnpm --filter backend test:e2e` (e2e).

### 4.3 Environment variables

Root `.env.example`:

```
POSTGRES_USER=arafat
POSTGRES_PASSWORD=arafat
POSTGRES_DB=arafat_crm
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

JWT_SECRET=change-me
JWT_EXPIRES_IN=7d

BACKEND_PORT=3000
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000
```

Each app has its own `.env.example` re-declaring only what it reads.

### 4.4 Migrations

- Never auto-sync. `synchronize: false` in every config.
- Every schema change is a new migration file generated via `pnpm --filter backend migration:generate`.
- Backend container entrypoint runs `migration:run` before starting Nest.

---

## 5. Data model

All primary keys are `uuid` (generated via `gen_random_uuid()`). All timestamps are `timestamptz`. `updated_at` is maintained by a TypeORM base entity using `@BeforeUpdate()`.

### 5.1 Enums

```
user_role       : ADMIN | SALES
client_source   : FACEBOOK | INSTAGRAM | TIKTOK | BROKER | GOOGLE
deal_stage      : NEW | QUALIFIED | MEETING | PROPOSAL | NEGOTIATION | CONTRACT | WON | LOST
deal_location   : BARWA_ALSADD | ELEMENT_WESTBAY | MARINA50_LUSAIL
deal_space_type : WORKSTATION | OFFICE
```

### 5.2 Tables

**`users`**
- `id uuid PK` · `name text NOT NULL` · `email citext UNIQUE NOT NULL` · `password_hash text NOT NULL` · `role user_role NOT NULL DEFAULT 'SALES'` · `created_at timestamptz NOT NULL DEFAULT now()` · `updated_at timestamptz NOT NULL DEFAULT now()`

**`clients`**
- `id uuid PK` · `name text NOT NULL` · `phone text NOT NULL` · `email text NULL` · `company_name text NULL` · `source client_source NOT NULL` · `created_at`, `updated_at`
- Indexes: `clients_source_idx (source)`; functional index on `lower(email)` for case-insensitive lookup.
- **Email is not unique** — duplicate client emails are allowed (a single contact may exist for multiple companies). Enforced only by the optional-and-non-unique column definition; no uniqueness check in the service layer either.

**`brokers`**
- `id uuid PK` · `name text NOT NULL` · `phone text NOT NULL` · `company text NULL` · `contract_from date NOT NULL` · `contract_to date NOT NULL` · `created_at`, `updated_at`
- Check: `contract_to >= contract_from`.

**`deals`**
- `id uuid PK`
- `client_id uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT`
- `broker_id uuid NULL REFERENCES brokers(id) ON DELETE SET NULL`
- `payment_terms text NULL`
- `currency char(3) NOT NULL DEFAULT 'QAR'`
- `expected_value numeric(12,2) NOT NULL CHECK (expected_value >= 0)`
- `expected_close_date date NOT NULL`
- `stage deal_stage NOT NULL DEFAULT 'NEW'`
- `location deal_location NOT NULL`
- `space_type deal_space_type NOT NULL`
- `created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
- `created_at`, `updated_at`
- Indexes: `deals_stage_idx (stage)`, `deals_close_date_idx (expected_close_date)`, `deals_client_idx (client_id)`, `deals_created_by_idx (created_by)`.

**`deal_stage_history`**
- `id uuid PK` · `deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE` · `from_stage deal_stage NULL` · `to_stage deal_stage NOT NULL` · `changed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT` · `changed_at timestamptz NOT NULL DEFAULT now()`
- Index: `deal_stage_history_deal_idx (deal_id, changed_at DESC)`.

### 5.3 Data-layer behaviour

- On `POST /deals`, service inserts an initial `deal_stage_history` row with `from_stage = NULL` so timelines always have a starting point.
- Every stage change (`PATCH /deals/:id/stage`, `POST /deals/:id/reopen`) wraps the `deals` update and `deal_stage_history` insert in one transaction.
- Delete is **hard delete** across all tables (no `deleted_at`). Referential integrity is enforced via RESTRICT/CASCADE/SET NULL as above.

---

## 6. Backend

### 6.1 Modules

`auth`, `users`, `clients`, `brokers`, `deals`, `dashboard`, `reports`, plus `common/` for filters, guards, pipes, decorators.

Each entity module follows the Nest shape: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/`.

### 6.2 Auth

- `POST /auth/register` — `{ name, email, password }`; bcrypt (cost 12); returns `{ user, token }`. Open in v1 per source prompt; harden later.
- `POST /auth/login` — `{ email, password }`; returns `{ user, token }`.
- `GET /auth/me` — current user without `password_hash`.
- JWT payload: `{ sub: userId, role }`. Signed with `JWT_SECRET`, 7-day default.
- `JwtAuthGuard` applied globally; `@Public()` decorator exempts `/auth/login` and `/auth/register`.
- `@Roles('ADMIN')` + `RolesGuard` for admin-only routes.

### 6.3 Permission model

- **Roles:** `ADMIN`, `SALES`.
- **Clients and brokers are shared reference data.** Any authenticated user can read, create, or update them. Only `ADMIN` can `DELETE /brokers/:id`. `DELETE /clients/:id` is allowed for any authenticated user but blocked by the "has deals" rule.
- **Deals are owned.** `deals.created_by` is the owner.
  - `SALES`: list/get is auto-scoped to `created_by = currentUser.id`. Mutations (`PATCH`, `DELETE`, stage change, reopen) require ownership or 403.
  - `ADMIN`: sees and mutates all deals, plus can call `PATCH /deals/:id/owner` to reassign.
- Ownership checks live in the `deals` service (not a guard) so the service can read the row before deciding.
- Dashboard and reports data are role-scoped: `SALES` sees their own numbers; `ADMIN` sees totals.

### 6.4 REST API

All under `/api/v1`. Bearer auth required unless marked public.

| Method & path | Notes |
|---|---|
| `POST /auth/login` (public), `POST /auth/register` (public), `GET /auth/me` | — |
| `GET /users` (ADMIN) | Paginated. |
| `POST /users` (ADMIN) | — |
| `PATCH /users/:id` | ADMIN or self; self cannot change own role. |
| `DELETE /users/:id` (ADMIN) | Cannot delete self. |
| `GET /clients` | `?page&limit&q&source`. `q` ILIKEs name/phone/email/company. |
| `POST /clients`, `GET /clients/:id`, `PATCH /clients/:id` | — |
| `DELETE /clients/:id` | 409 `CLIENT_HAS_DEALS` with `{ dealsCount }` if referenced. |
| `GET /brokers` | `?page&limit&q&onlyActive` (onlyActive filters contract valid today). |
| `POST /brokers`, `GET /brokers/:id`, `PATCH /brokers/:id` | — |
| `DELETE /brokers/:id` (ADMIN) | — |
| `GET /deals` | `?page&limit&q&stage&location&brokerId&source&from&to`. `from`/`to` filter `expected_close_date`. `source` filters on `clients.source` via join. SALES auto-scoped to own. |
| `POST /deals` | Writes initial `deal_stage_history` row. |
| `GET /deals/:id`, `PATCH /deals/:id`, `DELETE /deals/:id` | Ownership-checked. |
| `PATCH /deals/:id/stage` | Body `{ stage, confirmTerminal?: boolean }`. Moving into `WON`/`LOST` requires `confirmTerminal: true`, else 409 `TERMINAL_CONFIRMATION_REQUIRED`. Moving out of `WON`/`LOST` is rejected — use reopen. Transactional (`deals` update + `deal_stage_history` insert). |
| `POST /deals/:id/reopen` | Owner or ADMIN. Moves a `WON`/`LOST` deal back to `NEGOTIATION`. Logs to history. |
| `PATCH /deals/:id/owner` (ADMIN) | Body `{ userId }`. Reassigns `created_by`. |
| `GET /deals/:id/history` | `deal_stage_history` rows joined with user name, newest first. |
| `GET /dashboard/stats` | Role-scoped (SALES → own; ADMIN → all). Returns `{ totalDeals, wonDeals, lostDeals, revenueQar, conversionRate }`. |
| `GET /reports/win-loss` | `?from&to&location&brokerId`. Win/lost counts + revenue sum. Role-scoped. |
| `GET /reports/by-location` | `?from&to`. Bar-chart data. Role-scoped. |
| `GET /reports/by-source` | `?from&to`. Bar-chart data. Role-scoped. |
| `GET /reports/revenue-timeseries` | `?from&to`. `bucket` is fixed to `month` in v1 (column reserved for future `week`/`quarter`). Line-chart data (WON deals, bucketed by `expected_close_date`). Role-scoped. |

List endpoints return `{ data: T[], page, limit, total }`. Default `limit = 20`, max `100`.

### 6.5 Validation, errors, pagination

- `ValidationPipe` global with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- Global `HttpExceptionFilter` normalizes responses to `{ statusCode, message, error, details? }`. Unexpected errors → 500 with a generic message; stack logged server-side only.
- Business-rule violations throw `ConflictException` (409) with machine-readable `error` codes listed below.

**Error codes**

- `CLIENT_HAS_DEALS` — delete client blocked; `details.dealsCount`.
- `BROKER_CONTRACT_EXPIRED` — attempt to assign an out-of-contract broker.
- `TERMINAL_CONFIRMATION_REQUIRED` — PATCH stage to `WON`/`LOST` without `confirmTerminal: true`.
- `TERMINAL_STAGE_LOCKED` — PATCH stage tried to move out of `WON`/`LOST` (must use reopen).
- `NOT_DEAL_OWNER` — 403 on non-owner mutation.
- `CANNOT_DELETE_SELF` — user tried to delete their own account.

### 6.6 Swagger

`@nestjs/swagger` mounted at `/api/docs`. DTOs decorated with `@ApiProperty`. Bearer security scheme configured.

---

## 7. Frontend

### 7.1 Layout and theme

- Fixed left sidebar, 240px. Nav: Dashboard · Pipeline · Deals · Clients · Brokers · Reports · (admin) Users.
- Top bar: global search routes to `/deals?q=…`; user menu (profile, logout); role badge.
- Desktop-first; at `<1024px` sidebar collapses to icons; at `<768px` becomes a drawer.
- Tailwind theme overrides TailAdmin tokens with the spec's design system:
  - Primary `#2563EB` · hover `#1D4ED8` · tint `#DBEAFE`
  - Surface white on `#F8FAFC`
  - Text `#0F172A` / `#64748B`
  - Borders `#E2E8F0`
  - Radius `12px` (cards) / `8px` (inputs, buttons)
  - Shadow `0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)`
  - Clean, minimal SaaS; no gradients, no emoji in UI.

### 7.2 Routing and auth

- React Router v6. A `<ProtectedRoute>` wrapper around `AppLayout` redirects to `/login` if there's no token.
- `AuthContext` holds `{ user, token, login, logout }`. Token persisted to `localStorage`. Fetch client attaches `Authorization: Bearer <token>`.
- Admin-only routes (`/users`) gated by `user.role === 'ADMIN'`; non-admins get 404 UI.

### 7.3 Data layer

- Single typed fetch wrapper in `lib/api/` (checks status, parses JSON, throws a normalized `ApiError`).
- TanStack Query for all server state. Keys: `['deals', filters]`, `['deal', id]`, `['deal', id, 'history']`, `['clients', filters]`, etc.
- Mutations invalidate affected keys; stage-change mutation optimistically updates `['deals', filters]` and `['dashboard', 'stats']`, rolls back on error.

### 7.4 Pages

1. **`/login`** — email + password, "sign up" link.
2. **`/` Dashboard** — 5 `StatCard`s (Total Deals · Won · Lost · Revenue QAR · Conversion %); "Pipeline snapshot" panel (stage-count bars) and "Recent activity" panel (last 10 history rows across accessible deals).
3. **`/pipeline` Kanban** — 8 columns in order NEW → QUALIFIED → MEETING → PROPOSAL → NEGOTIATION → CONTRACT → WON → LOST. Horizontal scroll below 1600px. WON/LOST columns visually distinct (green/red tinted headers, dashed border). Dragging a card into WON/LOST opens a `ConfirmDialog`; only on confirm does `PATCH /deals/:id/stage` fire with `confirmTerminal: true`. Dragging out of WON/LOST is blocked client-side by the drop zone (UX nicety); the backend is the authority and would return 409 `TERMINAL_STAGE_LOCKED` if bypassed. Hovering a terminal card shows a "Reopen" button that hits `POST /deals/:id/reopen`. Optimistic updates with rollback. Cards show: client name, company, expected value QAR, close date, location, space-type icon.
4. **`/deals` list** — `DataTable` with filters (stage, location, broker, source, date range, search). Row click → `/deals/:id`. "New Deal" opens a modal.
5. **`/deals/:id`** — two-column: left = `DealForm` pre-filled (PATCH in place, toast on success); right = `StageHistoryTimeline` (vertical timeline, from→to badges + user + timestamp, newest first). Header has "Reopen" (if terminal) and "Reassign owner" (ADMIN only).
6. **`/clients`** — `DataTable`, source filter + search, add/edit modal. Delete shows confirm; on 409, toast: "This client has N deals and cannot be deleted."
7. **`/brokers`** — `DataTable`, "only active" toggle. Expired brokers rendered muted + "Expired" badge. Add/edit modal. Delete is ADMIN-only.
8. **`/reports`** — Filter bar (date range, location, broker, source). Four `ReportChartCard`s: Win vs Lost (donut), Revenue over time (line), By location (bars), By source (bars).
9. **`/users`** (ADMIN) — list + add/edit/delete. Cannot delete self.

### 7.5 Components

- **Primitives:** `Button`, `Input`, `Select`, `Textarea`, `DatePicker`, `Modal`, `ConfirmDialog`, `Card`, `Badge`, `Tabs`, `Tooltip`, `EmptyState`, `ErrorState`, `Skeleton`.
- **Composed:** `DataTable` (sort, pagination, row click, baked-in loading/empty/error states), `FilterBar`, `Pagination`, `StatCard`, `StageBadge`, `CurrencyText`, `DateText`, `UserAvatar`.
- **Feature:** `KanbanBoard`, `KanbanCard`, `DealForm`, `ClientForm`, `BrokerForm`, `StageHistoryTimeline`, `ReportChartCard`.

### 7.6 Forms and validation

- React Hook Form + Zod resolver. Zod schemas in `frontend/src/lib/validation/`, importing enums from `packages/shared`.
- Validation mirrors backend — required fields per spec's "Forms" section.
- On submit: pending state disables submit button; 409 errors are surfaced as form-level toasts with the backend's human-readable message; field-specific validation errors from the backend map to field errors where possible.

### 7.7 UX states

Every list and form has loading, empty, and error states:

- Lists: skeleton rows while loading; `EmptyState` with illustration + CTA when 0 rows; `ErrorState` with retry.
- Forms: inline field errors; form-level error banner on submit failure; disabled submit while pending.

---

## 8. Business rules (authoritative, backend-enforced)

Front-end may pre-check, but backend re-validates every mutation.

1. **Currency.** `'QAR'` hard-coded on insert; no UI control. Column retained.
2. **Terminal stage confirmation.** Moving into `WON` or `LOST` requires `confirmTerminal: true` in the request body (409 `TERMINAL_CONFIRMATION_REQUIRED` otherwise). Frontend surfaces a confirm dialog before sending.
3. **Terminal stage lock.** `PATCH /deals/:id/stage` cannot move out of `WON`/`LOST` (409 `TERMINAL_STAGE_LOCKED`). The only exit is `POST /deals/:id/reopen`, which sets stage to `NEGOTIATION` and writes history.
4. **Stage history.** Every stage change — create, patch, reopen — is logged in `deal_stage_history` inside the same transaction as the `deals.stage` change. Create logs `from_stage = NULL`.
5. **Client delete block.** `DELETE /clients/:id` fails with 409 `CLIENT_HAS_DEALS` if any deal references the client. DB-level `ON DELETE RESTRICT` backs this up.
6. **Broker contract validity.** On `POST /deals` and on `PATCH /deals/:id` that changes `broker_id`: today must satisfy `contract_from <= today <= contract_to`. Otherwise 409 `BROKER_CONTRACT_EXPIRED`. Historical deals keep their broker if the contract later expires (no retroactive unassignment).
7. **Ownership.** SALES can only mutate their own deals; ADMIN can mutate any and reassign owners via `PATCH /deals/:id/owner`.
8. **Role scope for analytics.** `/dashboard/stats`, `/reports/*` are scoped to `created_by = currentUser.id` for SALES; unscoped for ADMIN.

---

## 9. Testing

Scope per Q8 decision: **backend unit + e2e, no frontend tests.**

### 9.1 Unit tests (Jest, co-located `*.spec.ts`)

- `deals.service` — stage transitions: terminal requires confirm, reopen path, history written, ownership check rejects non-owner SALES, ADMIN bypass.
- `deals.service` — broker validity check on create and on broker change.
- `clients.service` — delete returns 409 with correct count.
- `dashboard.service` / `reports.service` — KPI math: conversion rate, revenue sum, timeseries bucketing, against fixed fixtures.
- `auth.service` — password hashing, JWT issuance, `me` omits `password_hash`.

### 9.2 E2E tests (`test/*.e2e-spec.ts`, supertest)

One file per controller, happy path plus the rejection cases that have user-visible behaviour:

- Auth: register, login, me with and without token.
- Clients: CRUD + delete-with-deals 409.
- Brokers: CRUD + assigning an expired broker 409.
- Deals: CRUD + stage transition (non-terminal), terminal-confirm rejection, terminal-confirm success, reopen, ownership 403 for non-owner SALES, ADMIN bypass.
- Dashboard/reports: role scoping (SALES vs ADMIN returning different numbers on the same data).

Test database: a dedicated Postgres instance spun up via `docker-compose.test.yml` (separate port, wiped per run).

---

## 10. Seed data

Script `backend/seed/seed.ts` is idempotent — truncates (preserving enum types) then inserts:

- **3 users**
  - `admin@arafat.qa` / `Admin@123` — ADMIN
  - `sales1@arafat.qa` / `Sales@123` — SALES
  - `sales2@arafat.qa` / `Sales@123` — SALES
- **10 clients** across all 5 sources.
- **3 brokers**
  - One currently valid (contract_to > today + 60d)
  - One valid but expiring in 30 days
  - One expired (contract_to < today) — exercises greyed-out UI
- **25 deals** with stage distribution: 4 NEW, 4 QUALIFIED, 3 MEETING, 3 PROPOSAL, 3 NEGOTIATION, 2 CONTRACT, 4 WON, 2 LOST. Locations and space types distributed. `created_by` split ~60/40 between the two sales users. `expected_value` 8 000–120 000 QAR. Non-terminal deals' `expected_close_date` sits ±90 days from today; the 4 WON deals are spread across four distinct past months (t-1, t-2, t-3, t-4) so the seeded revenue-over-time line chart shows a non-trivial trend on first run.
- Each seeded deal gets an initial `deal_stage_history` row. A handful of WON/LOST deals get extra history rows (so the timeline on the deal detail page isn't trivial).

Run via `pnpm --filter backend seed`. The README also documents a one-shot `docker compose run --rm backend pnpm seed` path.

---

## 11. Quality bar (definition of done)

- Every list page: loading / empty / error states verified manually.
- Every form: client and server validation, error toasts, disabled submit while pending.
- All 409s carry human-readable `message`s; frontend surfaces them verbatim.
- Swagger at `/api/docs` reflects actual behaviour — regenerated on each build.
- `docker compose up` from a clean clone → fully working app at `http://localhost:<FRONTEND_PORT>` with demo data after migrations + seed.
- All backend unit and e2e tests green.

---

## 12. Risks and open questions

- **Open auth/register.** `POST /auth/register` is public per source prompt. Suggested follow-up: ADMIN-only registration or first-admin bootstrap.
- **TailAdmin Pro license.** Customer must own a valid TailAdmin Pro license; implementation will import only the components used and strip the rest. License file stays out of git.
- **No frontend tests.** Kanban DnD and deal detail are the highest-risk surfaces; plan to add component tests for them if regressions appear.
- **Revenue = sum of WON `expected_value`.** Per spec. If actual (signed/paid) values diverge from `expected_value`, a separate `actual_value` column would be needed — out of scope.
- **Global search in top bar** routes only to `/deals?q=…` in v1; cross-entity search is out of scope.

---

## 13. Decisions log (summary)

| # | Decision | Rationale |
|---|---|---|
| 1 | TailAdmin Pro as frontend base | User selection (Q1 = A). |
| 2 | Roles ADMIN + SALES | User selection (Q2 = B). |
| 3 | TypeORM over Prisma | User selection (Q3 = recommendation). |
| 4 | Inline outcome lanes in kanban | User selection (Q4 = A). |
| 5 | SALES sees/edits only own deals; ADMIN sees all; ADMIN reassign | User selection (Q5 = C). |
| 6 | Reports: 4-chart grid (win/loss, location, source, revenue-over-time) | User selection (Q6 = B). |
| 7 | Deal detail = form + stage history timeline | User selection (Q7 = B). |
| 8 | Backend unit + e2e tests, no frontend tests | User selection (Q8 = C). |
| 9 | QAR-only v1; currency column retained | User selection (Q9 = A). |
| 10 | pnpm workspaces + `packages/shared` for shared types | Recommended; user accepted. |
| 11 | Hard delete across entities | Matches source prompt; simpler. |
| 12 | Keep `/users` admin page; new deal opens in modal | Proposed defaults, user accepted via "proceed." |
