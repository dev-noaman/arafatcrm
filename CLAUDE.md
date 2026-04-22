# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArafatCRM is a real estate CRM with NestJS backend and React frontend, managing clients, brokers, and deals.

## Commands

### Root (pnpm workspaces)
```bash
pnpm dev              # Start backend + frontend concurrently
pnpm build            # Build all packages
pnpm test             # Run backend unit tests
pnpm test:e2e         # Run backend e2e tests (requires PostgreSQL)
pnpm seed             # Seed demo data
pnpm migration:run    # Run database migrations
pnpm migration:generate -- -d ./typeorm.config.ts  # Generate new migration
```

### Backend
```bash
pnpm --filter backend dev       # Dev server (watch mode)
pnpm --filter backend test      # Unit tests
pnpm --filter backend test:e2e  # E2E tests (needs DB)
pnpm --filter backend seed      # Run seed script
```

### Frontend
```bash
pnpm --filter frontend dev      # Vite dev server
pnpm --filter frontend build    # Production build
```

### Run single test file
```bash
pnpm --filter backend test:e2e -- --testPathPattern=deals
```

## Architecture

### Monorepo Structure (pnpm workspaces)
```
├── backend/           # NestJS API
├── frontend/          # React + Vite + Tailwind CSS v4
├── packages/shared/   # Shared types/enums
```

### Backend Modules
Each module follows NestJS conventions with entity, controller, service, and DTOs:
- `auth/` - JWT auth with Passport, profile endpoints (`GET /auth/me`, `PUT /auth/profile`)
- `users/` - User management (admin-only CRUD)
- `clients/` - Client records with bulk import
- `brokers/` - Broker management with contract dates, broker type (Personal/Corporate), document uploads (QID, CR, TL, Computer Card, Others), `broker-document.entity.ts` for file attachments with CASCADE delete, `broker-upload.helper.ts` for Multer config (10MB, PDF/JPEG/PNG/WebP), bulk import
- `deals/` - Deal pipeline with stage transitions, phone field, ownerId assignment, default stage "NEW"
- `todos/` - Todo list CRUD scoped by userId
- `dashboard/` - Stats and analytics
- `reports/` - Overall staff summary (with month filter, win/lost rates), staff win/loss + win rate charts, location/source charts, pipeline stage chart, broker performance (with month filter), space type breakdown
- `data-sources/` - Dynamic data sources CRUD (backend only, frontend uses hardcoded list)
- `mail/` - SMTP email via `@nestjs-modules/mailer` + `nodemailer`

### Frontend Stack
- **React 18** + **Vite 5** + **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss` (NOT `@tailwindcss/vite`)
- **Zustand** for auth state, **TanStack Query** for data fetching
- **React Router v6** for routing
- **ApexCharts** (react-apexcharts) for charts with distinct per-source colors
- **html2pdf.js** for PDF export
- UI template: TailAdmin (customized with `@theme` directives in `tailadmin.css`)

### Frontend Pages
- `/dashboard` - Dashboard with stats, LocationChart, SourceChart (distinct colors), StaffWinLossChart, StaffWinRateChart
- `/clients` - Client CRUD with phone (Qatar +974), source dropdown, assign-to, view/edit modals, bulk import (CSV upload + template download)
- `/brokers` - Broker CRUD with contract dates, type (Personal/Corporate), document upload/download, active status toggle, view/edit modals, bulk import (CSV upload + template download)
- `/pipeline` - Kanban board (6 stages: New → Contract), deal detail modal with full inline editing (title, value, stage, phone, broker, location, space type, sales rep, expected close, notes), drag-and-drop stage changes
- `/deals` - Deal table with filters, client autocomplete, inline new client creation, Sales Rep and Broker columns
- `/reports` - Overall staff summary (month filter, win/lost rates), staff win/loss + win rate charts, location/source charts (ApexCharts), space type breakdown, pipeline stage table, broker performance (month filter), PDF export
- `/users` - User management (admin-only)
- `/profile` - Edit name, email, change password

### Key Components
- `PhoneInput` - Qatar +974 phone with flag SVG, configurable `maxDigits` (6 for deals, 8 for clients/brokers)
- `ClientAutocomplete` - Searchable dropdown filtering by name/phone/email, with "Create new client" link
- `GlobalSearch` - Navbar search (Ctrl+K) across clients and deals with dropdown results
- `TodoCard` - Inline todo widget with add/toggle/delete (removed from dashboard)

### Key Patterns
- **Entities**: TypeORM with snake_case columns via `@Column({ name: "snake_case" })`
- **Relations**: Use `@JoinColumn({ name: "foreign_key_id" })` for explicit FK mapping
- **Validation**: class-validator DTOs with `whitelist: true` and `forbidNonWhitelisted: true`
- **Auth**: JwtGuard extracts user from Bearer token, sets `req.user = { id, email, role }`
- **Roles**: `@Roles(Role.ADMIN)` decorator with RolesGuard; sidebar filters by `adminOnly` flag
- **Global prefix**: `api/v1` configured in main.ts
- **Bulk import**: CSV file upload or text paste, downloadable template, auto-strips header row

### Shared Package (`packages/shared`)
Contains enums and DTOs used by both frontend and backend:
- `DealStatus`: active, won, lost
- `DealStage`: lead, NEW, QUALIFIED, MEETING, PROPOSAL, NEGOTIATION, CONTRACT, WON, LOST
- `ClientSource`: MZAD_QATAR, FACEBOOK, GOOGLE, INSTAGRAM, TIKTOK, YOUTUBE, PROPERTY_FINDER, MAZAD_ARAB, REFERRAL
- `DealLocation`: BARWA_ALSADD, ELEMENT_WESTBAY, MARINA50_LUSAIL
- `DealSpaceType`: CLOSED_OFFICE, ABC_ADDRESS, ABC_FLEX, ABC_ELITE
- `BrokerType`: PERSONAL, CORPORATE
- `BrokerDocumentType`: QID, CR, TL, COMPUTER_CARD, OTHERS

## Environment Variables

### Backend `.env`
```
NODE_ENV=development
BACKEND_PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/arafat_crm
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
SMTP_HOST=smtp.emailit.com
SMTP_PORT=587
SMTP_USER=emailit
SMTP_PASS=secret_MVseUMO7WC0OLrvQqK2poXdjKU986HWg
SMTP_FROM=info@arafatvisitor.cloud
```

## Environment Setup

### Prerequisites
- PostgreSQL running (via Docker: `docker-compose up -d db`)
- DATABASE_URL in backend/.env

### Quick Start
```bash
pnpm install
docker-compose up -d db
pnpm --filter backend migration:run
pnpm --filter backend seed
pnpm dev
```

## Testing Notes

- E2E tests use the actual database - seeds test data in `beforeAll` and cleans up in `afterAll`
- Tests set `JWT_SECRET` in `beforeAll` hook before app initialization
- JwtModule must use `registerAsync()` to read env vars at runtime (not compile time)
- All test routes use `/api/v1` prefix (configured via `app.setGlobalPrefix()`)

## Common Gotchas

1. **Enum values are case-sensitive**: `DealStage.LEAD = "lead"` (lowercase), but `DealStage.NEW = "NEW"` (uppercase)
2. **Snake_case columns**: TypeORM doesn't auto-convert camelCase; use explicit `@Column({ name: "..." })`
3. **Terminal stage transitions**: Require `confirmTerminal: true` in update DTO
4. **Stage updates auto-set status**: Setting stage to "WON" sets status to "won"
5. **Tailwind CSS v4 uses PostCSS**: Must use `@tailwindcss/postcss` in `postcss.config.js` — do NOT use `@tailwindcss/vite` (it fails to generate utility classes in this pnpm monorepo). Do NOT use `autoprefixer` (v4 handles it internally). All config is in `tailadmin.css` via `@theme` — no `tailwind.config.js` needed.
6. **Pipeline stages**: The kanban board shows 6 stages: New, Qualified, Meeting, Proposal, Negotiation, Contract (defined in `PipelinePage.tsx` `PIPELINE_STAGES`). New deals default to stage "NEW".
7. **Role checks**: Always compare against `"ADMIN"` (uppercase), never `"admin"`.
8. **Client sources are hardcoded**: Frontend uses a static `CLIENT_SOURCES` / `SOURCES` array in components, not the data-sources API. The `data-sources` backend module exists but is not used in the frontend.
9. **Deal phone vs client phone**: Deal phone uses `maxDigits={6}`, client/broker phone uses `maxDigits={8}`.
10. **Pipeline card detail modal**: All fields are fully editable — title, value, stage, phone, broker (dropdown), location, space type, sales rep (dropdown for admin), expected close, notes. Commission is not shown.
11. **Broker document requirements**: Personal brokers need QID; Corporate brokers need CR, TL, Computer Card, QID (all required), Others (optional). File uploads stored in `uploads/broker-docs/` via Multer.
12. **Broker commission**: Auto-calculated as `(deal.value / 12) * 0.5` (two weeks of monthly rent) when a broker is assigned to a deal. Stored as `commissionAmount` + `commissionRate=50` on the deal. Recalculated on deal update if value or broker changes.
13. **Broker tables**: `brokers` (has broker_type, contract_from, contract_to, is_active) and `broker_documents` (stores file metadata with FK to brokers, CASCADE delete). No `commissionRate` column on brokers entity.
14. **Upload serving**: Backend uses `@nestjs/serve-static` at `/uploads`; frontend proxies `/uploads` to backend via Vite config.
15. **Frontend .env**: `VITE_API_URL=/api/v1` (uses Vite proxy, not direct backend URL). Backend runs on port 3001.
16. **Bulk import CSV templates**: Brokers: `Name,Email,Phone,Company,BrokerType,ContractFrom,ContractTo`. Clients: `Name,Email,Phone,Company,Source`. Auto-strips header row if detected.
17. **Source chart colors**: Each client source has a distinct brand color (MZAD=blue, Facebook=#1877F2, Google=red, Instagram=pink, TikTok=black, YouTube=red, PropertyFinder=cyan, MazadArab=purple, Referral=green, Broker=amber).
