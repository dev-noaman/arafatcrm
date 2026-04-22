# Sales Role Scoping Design

## Problem

Sales users currently see all data across the CRM — every deal, client, broker, dashboard stat, and report. They need scoped access limited to their own data, while Admin retains full visibility.

## Approach

Service-layer filtering: each backend service method checks `user.role` and applies ownership filters when the role is `SALES`. Controllers pass `@User()` to services. No global interceptors.

A shared helper `scopeFilter(user)` returns the appropriate `where` clause based on role, reducing duplication across services.

## Backend Changes

### Deals

- `findAll`: when `user.role === "SALES"`, filter by `{ owner: { id: user.id } }`
- `findOne`: SALES ownership check — returns 404 (not 403) to avoid leaking existence of other users' deals
- `create`/`update`/`remove`: existing owner-or-admin checks are sufficient
- `findByClient`/`findByBroker`: inject `@User()`, add SALES owner filter. SALES gets empty result for other users' clients (not an error)
- `findByOwner`: **restrict to `@Roles(Role.ADMIN)`** — allows arbitrary ownerId lookup which is admin-only functionality
- No migration needed — `owner_id` column already exists

### Clients

- Add `created_by` FK column to `clients` table referencing `users.id`
- Entity: new `createdBy` relation (`ManyToOne` → `User`)
- `findAll`: SALES filtered by `WHERE created_by = :userId OR created_by IS NULL` (includes unassigned legacy clients)
- `findOne`: SALES ownership check — 404 if not theirs and not unassigned
- `update`/`remove`: SALES restricted to own clients (not unassigned ones — only admin can modify legacy clients)
- `create`: auto-set `createdBy` from authenticated user (ignored in DTO)
- `bulkCreate`: inject `@User()`, auto-set `createdBy` on every record. SALES users who bulk import see their imported clients immediately
- Migration: add `created_by` column (nullable). Legacy clients with NULL are visible to SALES in reads but only editable by ADMIN
- `assignedToId` in `CreateClientDto`: SALES users have this field stripped/ignored server-side to prevent assigning clients to other users via API manipulation

### Brokers

- `findAll`/`findOne`: accessible to all authenticated users (shared resource)
- `create`: accessible to all authenticated users
- `bulkCreate`: accessible to all authenticated users
- `update`/`remove`: `@Roles(Role.ADMIN)` — admin-only
- Document upload (`POST /:id/documents`): `@Roles(Role.ADMIN)` — admin-only
- Document delete (`DELETE /:id/documents/:documentId`): `@Roles(Role.ADMIN)` — admin-only
- Document download (`GET /:id/documents/:documentId/download`): accessible to all authenticated users
- No migration needed — no ownership column required

### Dashboard

All endpoints accept `@User()` and filter by role:

- `getStats`: SALES sees only their deals' stats (total, won, lost, active, revenue). `totalClients` shows their own client count. `totalBrokers` remains global (shared resource).
- `getRevenueTimeSeries`: SALES sees only their revenue over time
- `getByLocation`: SALES sees only their deals' location breakdown
- `getBySource`: SALES sees only their deals' source breakdown

Raw SQL queries add `WHERE d.owner_id = :userId` when role is SALES. For client counts, add `WHERE c.created_by = :userId OR c.created_by IS NULL`.

### Reports

- Overall Summary + Staff Charts: `@Roles(Role.ADMIN)` — admin-only
- Win/Loss: for SALES, returns a single row (their own performance only), not the full user comparison table. Inject `@User()`, filter deals by `owner.id`.
- Pipeline: SALES sees only their deals grouped by stage
- Space Type: SALES sees only their deals' space type breakdown
- Broker Performance: SALES sees only their deals' broker performance
- Location / Source charts: SALES sees only their deals' breakdown

### Todos

- Already fully scoped per user — no changes needed.

## Frontend Changes

### Navigation

- Reports: visible to SALES (backend filters data)
- Users: stays `adminOnly: true`
- No other sidebar changes needed

### Route Guards

- Add `RequireRole` wrapper component checking `user.role`
- Apply to `/users` route (requires ADMIN)
- Reusable for any future admin-only routes
- Redirect unauthorized users to `/dashboard`

### Deals Page

- SALES: don't call `usersApi.findAll()` for owner dropdown
- SALES: auto-assigned as owner on deal creation (no "Assign To" dropdown)
- Pipeline: renders filtered data from backend — no UI changes needed

### Clients Page

- Create: `createdBy` auto-set from auth token
- SALES: no "Assign To" option for clients (field stripped backend-side)
- View/Edit: only own clients accessible (backend enforces)

### Reports Page

- Overall Summary + Staff Charts: `{isAdmin && ...}` already conditional
- Win/Loss: SALES sees single-row table (their own performance)
- Other sections render for SALES with backend-filtered data

### Pipeline Page

- Backend filters deals by owner for SALES
- Frontend renders whatever the API returns — no changes needed

## Files to Modify

### Backend
- `backend/src/common/helpers/scope-filter.ts` — new shared `scopeFilter(user)` helper
- `backend/src/deals/deals.service.ts` — add SALES filter to findAll, findOne, findByClient, findByBroker
- `backend/src/deals/deals.controller.ts` — inject `@User()` on findByClient/findByBroker; `@Roles(ADMIN)` on findByOwner
- `backend/src/clients/client.entity.ts` — add createdBy relation
- `backend/src/clients/clients.service.ts` — add SALES filter + ownership checks on findAll, findOne, update, remove, create, bulkCreate
- `backend/src/clients/clients.controller.ts` — inject `@User()` on all endpoints; `@Roles(ADMIN)` on update/remove; strip assignedToId for SALES
- `backend/src/clients/dto/create-client.dto.ts` — no changes (assignedToId handled in service)
- `backend/src/brokers/brokers.controller.ts` — `@Roles(ADMIN)` on update, remove, document upload, document delete
- `backend/src/dashboard/dashboard.service.ts` — add user filter to all methods (deals by owner_id, clients by created_by)
- `backend/src/dashboard/dashboard.controller.ts` — inject @User()
- `backend/src/reports/reports.controller.ts` — `@Roles(ADMIN)` on admin endpoints, `@User()` on all others
- `backend/src/reports/reports.service.ts` — add user filter to non-admin reports; win-loss returns single row for SALES
- `backend/src/db/migrations/` — new migration: add `created_by` column to clients table

### Frontend
- `frontend/src/App.tsx` — add RequireRole route wrapper for /users
- `frontend/src/components/RequireRole.tsx` — new component
- `frontend/src/pages/deals/DealsPage.tsx` — hide owner dropdown for SALES
- `frontend/src/pages/deals/PipelinePage.tsx` — conditional owner UI for SALES
- `frontend/src/pages/clients/ClientsPage.tsx` — hide assign-to for SALES

## Verification

1. Login as Sales user
2. Dashboard: shows only personal stats (own deals, own clients, global broker count)
3. Deals: shows only own deals
4. Pipeline: shows only own deal cards
5. Clients: shows own clients + legacy unassigned clients (read-only for legacy)
6. Client bulk import: imported clients visible to the importing SALES user
7. Brokers: can view all, can create, cannot edit/delete/upload documents
8. Broker documents: can download, cannot upload or delete
9. Reports: sees personal reports (single-row win/loss, filtered pipeline/space/broker), no Overall Summary or Staff Charts
10. Users page: inaccessible (redirected to dashboard)
11. Login as Admin — everything works as before (no regression)
