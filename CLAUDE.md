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
- `clients/` - Client records with bulk import, SALES role scoped to own clients only (`created_by = userId`), create auto-sets `createdBy`
- `brokers/` - Broker management with contract dates, broker type (Personal/Corporate), document uploads (QID, CR, TL, Computer Card, Others), `broker-document.entity.ts` for file attachments with CASCADE delete, `broker-upload.helper.ts` for Multer config (10MB, PDF/JPEG/PNG/WebP), bulk import
- `deals/` - Deal pipeline with stage transitions, phone field, ownerId assignment, default stage "NEW". Meeting scheduling via `POST /deals/:id/schedule-meeting` and `DELETE /deals/:id/schedule-meeting`. Mark-as-lost sets both `status=lost` and `stage=LOST`.
- `todos/` - Todo list CRUD scoped by userId
- `dashboard/` - Stats and analytics
- `reports/` - Overall staff summary (with month filter, win/lost rates), staff win/loss + win rate charts, location/source charts, pipeline stage chart, broker performance (with month filter), space type breakdown
- `data-sources/` - Dynamic data sources CRUD (backend only, frontend uses hardcoded list)
- `officernd/` - OfficeRnD membership sync (cron every 30 min at :07/:37 Asia/Qatar), triage with assign/bulk-send-to-pipeline, `officernd_sync` entity (per-membership rows with PENDING→ASSIGNED→PIPELINED→IGNORED lifecycle), `officernd_sync_runs` entity (sync history), all endpoints admin-only via `@Roles(Role.ADMIN)`. Sync service never touches deals after initial push — only flags `upstreamChanges` diff for non-PENDING rows. Client auto-create uses source `OFFICERND_RENEWAL` with email dedup. Background sync uses `@nestjs/schedule` + `@nestjs/axios`. Pipeline deals from OfficeRnD have `officerndSyncId` FK set.
- `mail/` - SMTP email via `@nestjs-modules/mailer` + `nodemailer`
- `calendar/` - TidyCal integration with per-user OAuth2 (native `fetch`). `TidyCalToken` entity stores per-user tokens in `tidycal_tokens` table. `GET /calendar/connect` returns OAuth URL (any authenticated user). `GET /calendar/oauth/callback` is `@Public()` — handles TidyCal redirect, stores token for the user encoded in `state` param. `GET /calendar/status` returns connection status. Supports booking types, direct booking creation/update/cancel, and booking link generation.

### Frontend Stack
- **React 18** + **Vite 5** + **TypeScript**
- **Tailwind CSS v4** via `@tailwindcss/postcss` (NOT `@tailwindcss/vite`)
- **Zustand** for auth state, **TanStack Query** for data fetching
- **React Router v6** for routing
- **ApexCharts** (react-apexcharts) for charts with distinct per-source colors
- **lucide-react** for icons (Calendar, AlertCircle, etc.)
- **html2pdf.js** for PDF export
- UI template: TailAdmin (customized with `@theme` directives in `tailadmin.css`)

### Frontend Pages
- `/dashboard` - Dashboard with stats, LocationChart, SourceChart (distinct colors), StaffWinLossChart, StaffWinRateChart
- `/clients` - Client CRUD with phone (Qatar +974), source dropdown, assign-to, view/edit modals, bulk import (CSV upload + template download)
- `/brokers` - Broker CRUD with contract dates, type (Personal/Corporate), document upload/download, active status toggle, view/edit modals, bulk import (CSV upload + template download)
- `/pipeline` - Kanban board (8 stages: New → Contract + Won + Lost). Contract cards have WIN/LOSS buttons (WIN sets `stage=WON`, LOSS opens reason modal then sets `stage=LOST`). Won column (green) and Lost column (red) are toggleable. Meeting-stage cards have Schedule/Reschedule button that opens a date/time picker (Sun-Thu, 08:30-17:30, 30-min slots). Deal detail modal with full inline editing, drag-and-drop stage changes.
- `/deals` - Deal table with filters, client autocomplete, inline new client creation, Sales Rep and Broker columns
- `/reports` - Overall staff summary (month filter, win/lost rates), staff win/loss + win rate charts, location/source charts (ApexCharts), space type breakdown, pipeline stage table, broker performance (month filter), PDF export
- `/users` - User management (admin-only)
- `/officernd` - OfficeRnD renewal triage (admin-only): table of expiring memberships, inline assign-to dropdown, bulk send-to-pipeline, status tabs (default=PENDING), upstream change flags, sync-now button
- `/profile` - Edit name, email, change password, connect TidyCal (per-user OAuth2)

### Key Components
- `PhoneInput` - Qatar +974 phone with flag SVG, configurable `maxDigits` (6 for deals, 8 for clients/brokers)
- `ClientAutocomplete` - Searchable dropdown filtering by name/phone/email, with "Create new client" link
- `GlobalSearch` - Navbar search (Ctrl+K) across clients and deals with dropdown results
- `TodoCard` - Inline todo widget with add/toggle/delete (removed from dashboard)
- `Modal` - Accessible modal wrapper with `role="dialog"`, `aria-modal`, focus trap, Escape to close, focus restore on close. All modals should use this component instead of raw `div.fixed.inset-0`.

### Key Patterns
- **Entities**: TypeORM with snake_case columns via `@Column({ name: "snake_case" })`
- **Relations**: Use `@JoinColumn({ name: "foreign_key_id" })` for explicit FK mapping
- **Validation**: class-validator DTOs with `whitelist: true` and `forbidNonWhitelisted: true`
- **Auth**: JwtGuard extracts user from Bearer token, sets `req.user = { id, email, role }`
- **Roles**: `@Roles(Role.ADMIN)` decorator with RolesGuard; sidebar filters by `adminOnly` flag
- **SALES scoping**: SALES users see only their own data in clients (`created_by = userId`), deals (`ownerId = userId`), dashboard (personal stats); frontend hides edit/delete buttons and assign-to fields for SALES
- **Global prefix**: `api/v1` configured in main.ts
- **Bulk import**: CSV file upload or text paste, downloadable template, auto-strips header row
- **Accessibility**: All icon-only buttons must have `aria-label`. Use the shared `Modal` component for all modals (provides focus trap, aria-modal, Escape handling). Input/Select show red `*` when `required`. Use `text-gray-500` (not `text-gray-400`) for readable text to meet WCAG 4.5:1 contrast. Button touch targets are min 44x44px via `min-h-[44px]`/`min-w-[44px]`.

### Shared Package (`packages/shared`)
Contains enums and DTOs used by both frontend and backend:
- `DealStatus`: active, won, lost
- `DealStage`: lead, NEW, QUALIFIED, MEETING, PROPOSAL, NEGOTIATION, CONTRACT, WON, LOST
- `ClientSource`: MZAD_QATAR, FACEBOOK, GOOGLE, INSTAGRAM, TIKTOK, YOUTUBE, PROPERTY_FINDER, MAZAD_ARAB, REFERRAL, WEBSITE
- `DealLocation`: BARWA_ALSADD, ELEMENT_WESTBAY, MARINA50_LUSAIL
- `DealSpaceType`: CLOSED_OFFICE, ABC_ADDRESS, ABC_FLEX, ABC_ELITE
- `BrokerType`: PERSONAL, CORPORATE
- `BrokerDocumentType`: QID, CR, TL, COMPUTER_CARD, OTHERS
- `OfficerndSyncStatus`: PENDING, ASSIGNED, PIPELINED, IGNORED
- `ClientSource` also includes: `OFFICERND_RENEWAL` (used for auto-created clients from OfficeRnD sync)

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
SMTP_FROM=info@arafatcrm.cloud
OFFICERND_ORG_SLUG=arafat-business-centers
OFFICERND_CLIENT_ID=...
OFFICERND_CLIENT_SECRET=...
OFFICERND_GRANT_TYPE=client_credentials
OFFICERND_SCOPE=flex.community.memberships.read flex.community.companies.read flex.community.members.read
TIDYCAL_CLIENT_ID=your-tidycal-client-id
TIDYCAL_CLIENT_SECRET=your-tidycal-client-secret
TIDYCAL_REDIRECT_URI=https://arafatcrm.cloud/api/v1/calendar/oauth/callback
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

### Service URLs (development)
- Backend: http://localhost:3001
- API docs (Swagger): http://localhost:3001/api/docs
- Frontend: http://localhost:5173

### Demo Credentials (after seed)
| Email | Password | Role |
|-------|----------|------|
| admin@arafatcrm.com | password123 | ADMIN |
| sales@arafatcrm.com | password123 | SALES |

The seed creates 2 users, 10 clients, 5 brokers, and 15 deals.

### Docker
```bash
docker-compose up -d        # Start all services
docker-compose up -d db     # Start only PostgreSQL
docker-compose logs -f      # Tail logs
docker-compose down         # Stop all services
```

## API Endpoints (all prefixed `/api/v1`)

### Auth
- `POST /auth/register` - Register user
- `POST /auth/login` - Login (returns JWT)
- `POST /auth/refresh` - Refresh token
- `GET  /auth/me` - Current user profile
- `PUT  /auth/profile` - Update name/email/password

### Users (admin only)
- `GET /users`, `GET /users/:id`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id`

### Clients
- `GET /clients` (paginated; SALES sees only own), `GET /clients/:id`
- `POST /clients`, `PUT /clients/:id`, `DELETE /clients/:id`
- `POST /clients/bulk-import` (CSV)

### Brokers
- `GET /brokers` (paginated), `GET /brokers/:id`
- `POST /brokers`, `PUT /brokers/:id`, `DELETE /brokers/:id`
- `POST /brokers/bulk-import` (CSV)
- `POST /brokers/:id/documents` (multipart upload), `GET /brokers/:id/documents/:docId`, `DELETE /brokers/:id/documents/:docId`

### Deals
- `GET /deals` (paginated, filterable; SALES sees only own), `GET /deals/:id`
- `POST /deals`, `PUT /deals/:id`, `DELETE /deals/:id`
- `POST /deals/:id/mark-lost` (sets `status=lost` AND `stage=LOST`)
- `POST /deals/:id/schedule-meeting`, `DELETE /deals/:id/schedule-meeting`
- `GET /deals/client/:id`, `GET /deals/broker/:id`, `GET /deals/owner/:id`

### Todos
- `GET /todos`, `POST /todos`, `PUT /todos/:id`, `DELETE /todos/:id` (scoped by userId)

### Dashboard
- `GET /dashboard/stats`
- `GET /dashboard/revenue-timeseries`
- `GET /dashboard/by-location`, `GET /dashboard/by-source`

### Reports
- `GET /reports/win-loss` (with month filter)
- `GET /reports/pipeline`
- `GET /reports/broker-performance` (with month filter)
- `GET /reports/staff-summary`, `GET /reports/space-type`

### OfficeRnD (admin only)
- `GET /officernd/sync` (paginated triage list)
- `POST /officernd/sync/run` (manual sync trigger)
- `PATCH /officernd/sync/:id` (assign / change status)
- `POST /officernd/sync/bulk-send-to-pipeline`

### Calendar
- `GET /calendar/connect` (returns TidyCal OAuth URL)
- `GET /calendar/oauth/callback` (`@Public()` redirect target)
- `GET /calendar/status` (per-user connection status)
- `DELETE /calendar/connect` (disconnect TidyCal)
- `GET /calendar/booking-types` (list user's TidyCal booking types)
- `PUT /calendar/default-booking-type` (set default booking type)
- `POST /calendar/booking-link` (generate shareable booking link for a deal)

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
6. **Pipeline stages**: The kanban board shows 8 stages: New, Qualified, Meeting, Proposal, Negotiation, Contract, Won, Lost (defined in `PipelinePage.tsx` `PIPELINE_STAGES`). The shared `PIPELINE_STAGES` constant in `packages/shared/src/enums.ts` also lists all 8 (no LEAD). New deals default to stage "NEW". Won/Lost columns are toggleable via a "Hide/Show Won/Lost" button.
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
17. **Source chart colors**: Each client source has a distinct brand color (MZAD=pink, Facebook=blue, Google=red, Instagram=purple, TikTok=teal, YouTube=orange, PropertyFinder=cyan, MazadArab=violet, Referral=green, Website=indigo, OfficeRnD Renewal=purple).
18. **SALES client scoping**: SALES users only see clients they created (`created_by = userId` filter in service). No legacy null fallback. Creating a client auto-sets `createdBy`. Edit/delete buttons hidden for SALES in frontend.
19. **VPS deployment**: Use `Deploy-to-VPS.ps1` — first run with `-Init` flag, subsequent runs without for updates. VPS at `72.62.189.36`, domain `arafatcrm.cloud`, PM2 process name `arafatcrm-api`, nginx reverse proxy, entry point `dist/src/main.js`.
31. **SSL/HTTPS**: Let's Encrypt cert via certbot nginx plugin. Cert covers `arafatcrm.cloud` only — `www.arafatcrm.cloud` has no DNS A record so it's excluded. Cert auto-renews via certbot systemd timer. If cert is missing, run: `certbot --nginx -d arafatcrm.cloud --non-interactive --agree-tos --email info@arafatcrm.cloud --redirect`. Certbot and nginx plugin are already installed on the VPS.
20. **PM2 env caching**: PM2 caches environment variables from first start — must `pm2 delete` and recreate (not just restart) to clear cached env vars like `CORS_ORIGIN`.
21. **PM2 ecosystem config**: Use `/var/www/arafatcrm/ecosystem.config.js` with `cwd: "/var/www/arafatcrm/backend"` so NestJS `ConfigModule` finds `.env`. Always `pm2 start ecosystem.config.js` instead of `pm2 start dist/src/main.js` directly — otherwise `.env` is not loaded (PM2 doesn't read `.env` files; NestJS reads `.env` from cwd).
22. **`multer` dependency**: Must be in `backend/package.json` dependencies (not just `@types/multer`). The deploy script wipes `node_modules` on each deploy, so `pnpm install` must find it in `package.json`.
23. **OfficeRnD sync overwrite policy**: PENDING rows are overwritten freely on re-sync. ASSIGNED/IGNORED/PIPELINED rows are NOT overwritten — incoming diffs are stored in `upstreamChanges` jsonb with `upstreamChangedAt` timestamp. Admin must acknowledge to apply changes. The sync service never touches deals after the initial pipeline push.
24. **OfficeRnD client auto-create**: When sending to pipeline, dedup by email or phone. If `contactEmail` is null, generate `{officerndCompanyId}@officernd.placeholder` to avoid unique constraint collision. Both `name` and `company` fields are set to `sync.companyName`. Phone is extracted from member data (requires `flex.community.members.read` scope), then falls back to `company.phone`, `company.address.phone`, or `company.billingAddress.phone`.
25. **OfficeRnD deal defaults**: Renewal deals get `location="BARWA_ALSADD"`, `spaceType="CLOSED_OFFICE"`, `stage="NEW"`, no broker, no commission. Admin can change these in the pipeline.
26. **OfficeRnD pipeline cards**: Deals with `officerndSyncId` set render with a prominent purple gradient header banner ("OfficeRnD Renewal" + renewal date), purple border, and no inline badge. Regular cards have no banner.
27. **Circular entity import**: `deal.entity.ts` imports `OfficerndSync` and `officernd-sync.entity.ts` imports `Deal`. TypeORM handles this via lazy `() => Entity` syntax — both entities use this pattern.
28. **OfficeRnD API endpoints**: Memberships at `/api/v2/organizations/{slug}/memberships`, companies at `/api/v2/organizations/{slug}/companies`, members at `/api/v2/organizations/{slug}/members`. All use `$limit=50` max and `cursorNext` pagination. No `$expand` support — company/member IDs must be resolved separately. Membership fields: `_id`, `company` (ID), `name`, `price`, `endDate`, `member` (ID). Company fields: `_id`, `name`, `email`, `address`. Member fields: `_id`, `phone`, `mobile`, `email`. The ID field is `_id` (not `id`).
29. **OfficeRnD data enrichment**: Memberships contain a company ID and member ID reference. The sync service fetches all companies into a `Map<id, company>` and all members into a `Map<id, member>`, then enriches each membership with `companyName`, `contactEmail`, and `contactPhone`. Phone is extracted from `member.phone`, `member.mobile`, then falls back to company fields (`company.phone`, `company.address.phone`, `company.billingAddress.phone`). Members API requires `flex.community.members.read` scope — if scope is missing, fetch silently fails and phone falls back to company data only.
30. **OfficeRnD query method**: Use `findAndCount` with `relations: ["assignedUser", "client", "deal"]` — NOT `createQueryBuilder` with `leftJoinAndSelect`. The QueryBuilder approach fails at runtime with `TypeError: Cannot read properties of undefined (reading 'databaseName')` in production.
32. **Calendar per-user OAuth**: Each staff member connects their own TidyCal account via the Profile page (`/profile`). OAuth `state` param carries base64-encoded userId so the callback (`@Public()` endpoint) knows which user to store the token for. `GET /calendar/connect` is available to any authenticated user (not admin-only). `TidyCalToken` entity uses `upsert` on `userId` — reconnecting replaces the old token.
33. **Meeting scheduling**: Deals in the Meeting stage have `meetingDate`, `meetingTime`, `meetingDuration` (fixed 30 min), `meetingLocation`, `meetingNotes`, and `calendarEventId` columns. `POST /deals/:id/schedule-meeting` saves locally AND creates/updates a TidyCal booking if the user has connected their account. TidyCal API errors are caught silently — meeting data always saves locally even without TidyCal connection.
34. **Calendar event timezone**: All TidyCal bookings use `timeZone: "Asia/Qatar"` (UTC+3, no DST). Meeting time slots are 08:30–17:00 Sunday–Thursday.
35. **markAsLost sets stage**: The `markAsLost` service method sets both `status = "lost"` AND `stage = "LOST"` (plus appends to `stageHistory`). Without the stage update, lost deals won't appear in the pipeline Lost column.
36. **Pipeline data fetching**: The pipeline board fetches deals with all three statuses (`active`, `won`, `lost`) via `Promise.all` and buckets them client-side into 8 columns. Won/Lost deals are NOT filtered out.
