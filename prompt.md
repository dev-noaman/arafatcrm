# ArafatCRM — Build Specification

## Role
You are a senior full-stack engineer. Build a production-ready Sales CRM web app called **ArafatCRM** for Arafat Business Center, which rents Workstations and Office Spaces across three locations: Barwa Alsadd, Element Westbay, and Marina50 Lusail. Deliver clean, modular, scalable code with strong UX.

## Tech Stack (mandatory)
- **Backend:** NestJS (TypeScript), REST API, modular architecture (feature modules per entity)
- **Database:** PostgreSQL 15+ with TypeORM (or Prisma — pick one and stay consistent)
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS (TailAdmin Pro style)
- **Validation:** class-validator / class-transformer on backend; React Hook Form + Zod on frontend
- **Auth:** JWT-based (email + password), bcrypt hashed passwords
- **API Docs:** Swagger at `/api/docs`
- **Migrations:** required (no auto-sync in production)
- **Deliverable:** monorepo with `/backend` and `/frontend`, plus `docker-compose.yml` that spins up Postgres + backend + frontend

## PostgreSQL Schema

```sql
users (id, name, email UNIQUE, password_hash, role, created_at, updated_at)

clients (id, name, phone, email, company_name, source, created_at, updated_at)
-- source ENUM: FACEBOOK | INSTAGRAM | TIKTOK | BROKER | GOOGLE

brokers (id, name, phone, company, contract_from DATE, contract_to DATE, created_at, updated_at)

deals (
  id, client_id FK -> clients, broker_id FK -> brokers NULL,
  payment_terms TEXT, currency VARCHAR(3) DEFAULT 'QAR',
  expected_value NUMERIC(12,2), expected_close_date DATE,
  stage, location, space_type,
  created_by FK -> users, created_at, updated_at
)
-- stage ENUM: NEW | QUALIFIED | MEETING | PROPOSAL | NEGOTIATION | CONTRACT | WON | LOST
-- location ENUM: BARWA_ALSADD | ELEMENT_WESTBAY | MARINA50_LUSAIL
-- space_type ENUM: WORKSTATION | OFFICE

deal_stage_history (id, deal_id FK, from_stage, to_stage, changed_by FK -> users, changed_at)
```
Index on `deals(stage)`, `deals(expected_close_date)`, `deals(client_id)`, `clients(source)`.

## REST API (prefix `/api/v1`)
- `POST   /auth/login`, `POST /auth/register`, `GET /auth/me`
- `GET/POST/PATCH/DELETE  /clients`, `/clients/:id`
- `GET/POST/PATCH/DELETE  /brokers`, `/brokers/:id`
- `GET/POST/PATCH/DELETE  /deals`, `/deals/:id`
- `PATCH /deals/:id/stage` — body `{ stage }`, writes to `deal_stage_history`
- `GET   /dashboard/stats` — totals, won, lost, revenue (QAR), conversion rate
- `GET   /reports/win-loss?from=&to=&location=&brokerId=`

All list endpoints support: pagination (`page`, `limit`), search (`q`), and filters (`stage`, `location`, `brokerId`, `source`, `from`, `to`).

## Frontend Pages & Routes
| Route | Page |
|---|---|
| `/login` | Login |
| `/` | Dashboard |
| `/pipeline` | Kanban pipeline |
| `/deals` | Deals list (filters + table) |
| `/deals/:id` | Deal detail / edit |
| `/clients` | Clients list + add/edit modal |
| `/brokers` | Brokers list + add/edit modal |
| `/reports` | Reports (win vs lost, charts, filters) |

**Dashboard KPIs:** Total Deals · Won Deals · Lost Deals · Revenue (QAR, sum of WON `expected_value`) · Conversion Rate (Won / (Won + Lost)).

**Pipeline (Kanban):**
- Columns: New · Qualified · Meeting · Proposal · Negotiation · Contract (Won / Lost shown as separate outcome lanes or a side panel)
- Drag & drop updates stage via `PATCH /deals/:id/stage`
- Card shows: Client Name · Company · Expected Value (QAR) · Close Date · Location · Space Type

## Forms (with validation)
- **Client:** name*, phone*, email, company name, source* (dropdown)
- **Broker:** name*, phone*, company, contract validity from*/to*
- **Deal:** client* (linked, searchable), payment terms, currency (default QAR), expected value*, expected close date*, stage*, location*, space type*, broker (optional)

## Design System
- **Primary:** `#2563EB` (Royal Blue) · hover `#1D4ED8` · tint `#DBEAFE`
- **Surface:** white cards on `#F8FAFC` background
- **Text:** `#0F172A` primary, `#64748B` secondary
- **Borders:** `#E2E8F0`, 1px
- **Radius:** 12px (cards), 8px (inputs/buttons)
- **Shadow:** soft — `0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)`
- **Style:** clean, minimal SaaS (Linear / Stripe / TailAdmin Pro vibe). Clear typography, generous whitespace, no gradients, no emoji in UI.
- **Layout:** fixed left sidebar (240px), top bar with search + user menu, desktop-first, responsive down to tablet.

## Business Rules
- All monetary values in **QAR**.
- **WON** and **LOST** are terminal stages — the UI shows a confirmation before moving a deal into them, and they cannot be dragged back out (only via explicit "Reopen" action).
- Every stage change is logged in `deal_stage_history`.
- Deleting a client with deals is blocked — return 409 with a clear error.
- Broker's contract must be valid (today between `contract_from` and `contract_to`) to be assignable to new deals; expired brokers are shown greyed out.

## Quality Bar
- Type-safe end to end (shared DTO types between backend and frontend where practical).
- Error handling: global Nest exception filter, toast notifications on frontend.
- Loading, empty, and error states on every list and form.
- Seed script that inserts 3 users, ~10 clients, 3 brokers, and ~25 deals spread across stages and locations so the dashboard and pipeline look alive on first run.
- README with setup steps: `docker compose up`, env vars, migration + seed commands.

## Deliverables
1. `/backend` — NestJS app, modules (`auth`, `users`, `clients`, `brokers`, `deals`, `dashboard`, `reports`), migrations, seed script, Swagger.
2. `/frontend` — React + Vite app, all pages above, Tailwind config with the design tokens, reusable components (`Button`, `Input`, `Select`, `Modal`, `Card`, `KanbanBoard`, `DataTable`).
3. `docker-compose.yml` — services: `postgres`, `backend`, `frontend`.
4. `.env.example` files for both apps.
5. `README.md` with architecture overview and run instructions.

Build it scalable, production-ready, and focused on fast, simple sales tracking and deal conversion.