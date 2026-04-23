# OfficeRnD Renewals Integration — Design Spec

## Overview

Integrate OfficeRnD API to surface companies whose memberships expire within the next 3 months. Admin triages these in a dedicated page, assigns sales reps, then sends them to the deal pipeline as new deals with stage=NEW. A background cron syncs membership data every 30 minutes.

---

## 1. Database Schema

### 1.1 New Entity: `officernd_sync`

| Column (snake_case) | Property (camelCase) | Type | Notes |
|----------------------|----------------------|------|-------|
| `id` | id | uuid PK | Auto (BaseEntity) |
| `officernd_company_id` | officerndCompanyId | varchar | OfficeRnD company ID |
| `company_name` | companyName | varchar | Display name |
| `contact_email` | contactEmail | varchar nullable | From member/company data |
| `contact_phone` | contactPhone | varchar nullable | From member/company data |
| `membership_id` | membershipId | varchar | **Unique index** |
| `membership_type` | membershipType | varchar nullable | Plan/resource name |
| `membership_value` | membershipValue | decimal(15,2) nullable | Matches deals.value precision exactly |
| `end_date` | endDate | date | **Indexed** — hot query path |
| `officernd_data` | officerndData | jsonb nullable | Full membership + company payload |
| `status` | status | varchar enum | PENDING / ASSIGNED / PIPELINED / IGNORED |
| `assigned_to` | assignedTo | uuid nullable | FK → users.id, **ON DELETE SET NULL** |
| `client_id` | clientId | uuid nullable | FK → clients.id, **ON DELETE SET NULL** |
| `deal_id` | dealId | uuid nullable | FK → deals.id, **ON DELETE SET NULL** |
| `upstream_changes` | upstreamChanges | jsonb nullable | Diff: `{ endDate: { old: "...", new: "..." } }`. Cleared on acknowledge |
| `upstream_changed_at` | upstreamChangedAt | timestamp nullable | Set when upstream data differs on non-PENDING rows |
| `synced_at` | syncedAt | timestamp | Last sync time |
| `created_at`, `updated_at` | createdAt, updatedAt | timestamp | From BaseEntity |

**Unique constraint:** `membership_id` alone (globally unique in OfficeRnD).
**Indexes:** unique on `membership_id`; non-unique on `officernd_company_id`; non-unique on `end_date`.

**Re-sync overwrite policy:**
- PENDING rows: overwrite freely from OfficeRnD (name, email, phone, value, end date, type, raw data).
- ASSIGNED / IGNORED / PIPELINED rows: do NOT overwrite typed columns. Compare incoming data against current values. If different, set `upstreamChangedAt = now()` and `upstreamChanges = { field: { old, new } }`. Admin must acknowledge before data updates.
- **The sync service never touches deals** after the initial push — even for PIPELINED rows, it only flags upstream changes.

### 1.2 New Entity: `officernd_sync_runs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto (BaseEntity) |
| `started_at` | timestamp | |
| `finished_at` | timestamp nullable | |
| `status` | varchar enum | RUNNING / SUCCESS / FAILED / SKIPPED |
| `records_processed` | int nullable | |
| `records_created` | int nullable | |
| `records_updated` | int nullable | |
| `error_message` | text nullable | |
| `trigger` | varchar enum | CRON / MANUAL |

### 1.3 Deal Entity Change

Add nullable column `officernd_sync_id` (FK → `officernd_sync.id`, **ON DELETE SET NULL**). Deals with this set are OfficeRnD renewals — frontend uses this to render distinct cards.

### 1.4 Enum Additions

Add to `packages/shared/src/enums.ts`:

```typescript
export const OfficerndSyncStatus = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  PIPELINED: "PIPELINED",
  IGNORED: "IGNORED",
} as const;
```

Add `OFFICERND_RENEWAL` to `ClientSource` enum. Used when auto-creating clients from OfficeRnD data.

**Important:** The client entity (`backend/src/clients/client.entity.ts`) has an inline enum on the `source` column that does not include all `ClientSource` values. Update the entity's inline enum array to include all `ClientSource` values (not just the current 5), including `OFFICERND_RENEWAL`. Without this, auto-created clients will fail at the database level.

---

## 2. Backend — Module & API

### 2.1 New Module: `OfficerndModule`

Registered in `AppModule`. Contains:
- `OfficerndSyncEntity` + `OfficerndSyncRunEntity` (both extend `BaseEntity`)
- `OfficerndService` — sync logic, OfficeRnD API calls
- `OfficerndController` — REST endpoints
- DTOs with `class-validator`, `whitelist: true`, `forbidNonWhitelisted: true`

**New dependencies required:**
- `@nestjs/schedule` — install and register `ScheduleModule.forRoot()` in `AppModule`
- `@nestjs/axios` — HTTP client for OfficeRnD API calls

### 2.2 `OfficerndService` Methods

| Method | Description |
|--------|-------------|
| `authenticate()` | Get/refresh OAuth token. Cache in memory with expiry. One attempt per sync run. |
| `syncMemberships(trigger)` | Full sync: auth → paginate memberships (endDate in [today, today+3mo]) → upsert officernd_sync rows. Creates a sync_run record. |
| `getExpiringCompanies(filters)` | List with pagination, status filter, date range. PENDING tab filtered by `end_date BETWEEN today AND today+90` in Asia/Qatar time. |
| `getSyncRuns(filters)` | Paginated sync run history. |
| `assignSalesRep(id, userId)` | Set `assignedTo`, status → ASSIGNED |
| `unassign(id)` | Clear `assignedTo`, status → PENDING |
| `bulkAssign(ids[], userId)` | Batch assign |
| `sendToPipeline(id)` | Validate ASSIGNED. Auto-create Client (dedup by email/phone, source=OFFICERND_RENEWAL) if no `clientId`. **Wrap Client creation + Deal creation + sync row update in a database transaction.** Create Deal with: `stage="NEW"`, `stageHistory=["NEW"]`, `status="active"`, `ownerId=assignedTo`, `value=membershipValue`, `title="{companyName} — Renewal"`, `officerndSyncId=id`, `location="BARWA_ALSADD"` (default — admin can change in pipeline), `spaceType="CLOSED_OFFICE"` (default — admin can change). `commissionRate` and `commissionAmount` are null (no broker on renewal deals). Set dealId, clientId, status → PIPELINED. |
| `bulkSendToPipeline(ids[])` | Batch send |
| `ignore(id)` | status → IGNORED |
| `unignore(id)` | status → PENDING |
| `acknowledgeUpstreamChange(id)` | Clear `upstreamChanges` and `upstreamChangedAt`. Apply the pending upstream values to the typed columns. |
| `manualSync()` | Trigger immediate sync with trigger=MANUAL |

### 2.3 Controller Endpoints

All endpoints guarded with `@Roles(Role.ADMIN)`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/officernd/sync-status` | Last sync time, counts by status |
| GET | `/officernd/sync-runs` | Sync run history (paginated) |
| GET | `/officernd/expiring` | List expiring companies (paginated, filterable) |
| POST | `/officernd/sync` | Trigger manual sync |
| PATCH | `/officernd/:id/assign` | Assign sales rep (body: `{ userId }`) |
| PATCH | `/officernd/:id/unassign` | Unassign |
| POST | `/officernd/bulk-assign` | Bulk assign (body: `{ ids, userId }`) |
| POST | `/officernd/:id/send-to-pipeline` | Single send |
| POST | `/officernd/bulk-send-to-pipeline` | Bulk send (body: `{ ids }`) |
| PATCH | `/officernd/:id/ignore` | Mark ignored |
| PATCH | `/officernd/:id/unignore` | Mark as PENDING again |
| PATCH | `/officernd/:id/acknowledge` | Clear upstream change flag, apply diff |

### 2.4 Background Sync

- `@nestjs/schedule` with `@Cron('7,37 * * * *', { timeZone: 'Asia/Qatar' })` calling `syncMemberships('CRON')`.
- In-memory lock (`Promise` flag) prevents overlapping runs.
- No sync on app startup — first sync happens at first cron tick (max 30 min). "Sync Now" for immediate needs.

### 2.5 Auth & Error Handling

**Auth retry policy:**
- Pre-sync: one auth attempt. Fail → mark run FAILED, exit. Next cron tick is fresh start.
- Mid-sync token expiry: one refresh, continue from last page.
- Page failure: one retry. Fail → run FAILED, exit (no partial syncs).

**Timezone:** All date math (sync filter, urgency colors, relative timestamps) standardized on `Asia/Qatar`.

### 2.6 Environment Variables

All in `backend/.env` alongside existing vars:

```
OFFICERND_ORG_SLUG=arafat-business-centers
OFFICERND_CLIENT_ID=...
OFFICERND_CLIENT_SECRET=...
OFFICERND_GRANT_TYPE=client_credentials
OFFICERND_SCOPE=flex.community.memberships.read flex.community.companies.read
```

Start with two scopes. During implementation, log the first real membership payload (redact PII) and verify whether contact_email and contact_phone are present. If not, add `flex.community.members.read`.

### 2.7 Client Auto-Create

When `sendToPipeline` runs and no `clientId` exists on the sync row:
- Dedup: check if a client with matching email or phone already exists.
- If found: link existing client to sync row.
- If not found: create Client with `name=companyName`, `email=contactEmail`, `phone=contactPhone`, `source=OFFICERND_RENEWAL`.
- **Nullable email edge case:** Client entity has `unique: true` on email. If `contactEmail` is null, generate a placeholder: `{officerndCompanyId}@officernd.placeholder`. This avoids unique constraint collisions when multiple companies have no email. These placeholders are clearly not real emails and admin can update in the pipeline.

---

## 3. Frontend

### 3.1 Sidebar

New item in `AppSidebar.tsx`:
```typescript
{ icon: <Building2 />, name: "OfficeRnD", path: "/officernd", adminOnly: true }
```

Use Lucide `Building2` icon (already used in `PipelinePage.tsx`). Add a new SVG icon to `frontend/src/icons/` only if a custom icon is preferred.

### 3.2 Route Configuration

In `App.tsx`, wrap the `/officernd` route with `<RequireRole role="ADMIN">`, matching the existing pattern for `/users`:
```tsx
<Route path="/officernd" element={<RequireRole role="ADMIN"><OfficerndPage /></RequireRole>} />
```

### 3.3 New Page: `OfficerndPage.tsx` at `/officernd`

**Header bar:** Title "OfficeRnD Renewals", last sync relative timestamp ("12 minutes ago"), "Sync Now" button (disabled + spinner during active sync).

**Summary cards (visual only, not clickable):** Counts: PENDING (X), ASSIGNED (X), PIPELINED (X), IGNORED (X).

**Status tabs:** All / **Pending** (default) / Assigned / Pipelined / Ignored.

**Search:** Covers company name, email, phone.

**Data table columns:**

| Column | Content |
|--------|---------|
| Checkbox | For bulk selection |
| Company | `"Acme Corp — ABC Elite Plan"` (membership type disambiguates duplicates) + contact info |
| Membership | Type + value |
| End Date | Date, urgency coloring: < 30 days = amber text, < 7 days = red text (WCAG contrast). Expired rows: red "Expired" badge. |
| Assigned To | Inline dropdown of SALES-role users. Fires PATCH immediately on change — no save button. |
| Status | Badge: PENDING=gray, ASSIGNED=blue, PIPELINED=green, IGNORED=slate |
| Upstream | Yellow dot + tooltip if `upstreamChangedAt` set, with "Review" → acknowledge action |
| Actions | Send to Pipeline / Ignore / Unassign (context-appropriate per status) |

**Bulk action bar (appears when rows checked):**
- "Assign to [dropdown]" — works on PENDING + IGNORED rows
- "Send to Pipeline" — only enabled when all selected are ASSIGNED
- "Ignore" — works on PENDING + ASSIGNED
- "Unignore" — works on IGNORED
- Incompatible actions greyed out for mixed-status selections
- Confirm modal for bulk actions > 10 rows ("Send 23 renewals to pipeline?")

**No sales reps:** Message + link to `/users` to create one.

### 3.4 Pipeline Card Changes (`PipelinePage.tsx`)

Detect deals where `officerndSyncId` is set:
- Render with distinct styling: small OfficeRnD icon/badge (no colored border)
- Show both `endDate` (from OfficeRnD) and `expectedCloseDate` on the card
- Same drag-and-drop behavior as normal cards

---

## 4. Implementation Notes

Reminders for the implementation phase:

1. **Explicit `@Column({ name: "snake_case" })`** on every column (CLAUDE.md gotcha #2)
2. **`@Roles(Role.ADMIN)`** on every endpoint, including GETs
3. **Enum values in `packages/shared`**, not inline in backend or frontend
4. **Shared `Modal` component** (not raw `div.fixed.inset-0`) for confirm dialogs
5. **class-validator DTOs** with `forbidNonWhitelisted: true` for all request bodies
6. **PM2 env caching** (gotcha #20): deploying requires `pm2 delete && pm2 start` to pick up new `OFFICERND_*` env vars, not just `pm2 restart`
7. **Rotate `OFFICERND_CLIENT_SECRET`** — it was shared in the uploaded doc and should be treated as compromised
8. **Verify OAuth scope necessity:** log first real membership payload, check if contact info is present without `flex.community.members.read`. Add only if needed.
9. **Install `@nestjs/schedule`** and register `ScheduleModule.forRoot()` in `AppModule` before using `@Cron`.
10. **Install `@nestjs/axios`** for HTTP client to call OfficeRnD API.
11. **Update client entity inline enum** — widen the `source` column enum to include all `ClientSource` values including `OFFICERND_RENEWAL`.
12. **Transaction for `sendToPipeline`** — wrap Client creation + Deal creation + sync row update in `EntityManager.transaction`.
13. **`acknowledgeUpstreamChange` does NOT update the linked deal** — only updates the `officernd_sync` row. Admin must manually update the deal if desired.
