# Dashboard & Reports Split: Lead Sources vs OfficeRnD Renewals

**Date:** 2026-04-30
**Status:** Design approved, pending implementation plan

## Goal

Split `/dashboard` and `/reports` into two clearly-separated streams — **Lead Sources** (the existing channels: MZAD Qatar, Facebook, Google, Instagram, TikTok, YouTube, Property Finder, Mazad Arab, Referral, Website) and **OfficeRnD Renewals** (clients with source `OFFICERND_RENEWAL`, deals linked via `officerndSyncId`). The two streams have different business meanings and must be reported separately so admins can evaluate organic-lead performance independent of recurring-renewal volume.

## Out of scope

- The OfficeRnD sync logic (cron, upstream change tracking, lifecycle transitions).
- The OfficeRnD triage page (`/officernd`).
- Pipeline rendering.
- `/dashboard/revenue-timeseries`, `/reports/pipeline`, `/reports/broker-performance`, `/reports/space-type-breakdown` — none are flagged in the source request, all stay as-is. (Brokers are already empty for OfficeRnD deals; space-type-breakdown skew is a known follow-up.)

## Decisions (locked)

1. **Top stat cards on `/dashboard` become Leads-only.** The new OfficeRnD section gets its own parallel row of cards. Two visually symmetric streams.
2. **Membership Type Breakdown chart counts all non-IGNORED `officernd_sync` rows** (PENDING + ASSIGNED + PIPELINED). Reads as "renewal pipeline by product mix." IGNORED rows are admin-suppressed noise.
3. **PDF export pattern: per-section buttons**, matching the existing `useExportPdf` per-section pattern. No unified "export all" button.
4. **Module layout: new `officernd-reports` sub-module** with its own service+controller. Existing `dashboard.service.ts` and `reports.service.ts` only change to add filter parameters.
5. **Classifier storage: new `membership_type_class` column** on `officernd_sync` (the existing `membership_type` column already stores raw OfficeRnD plan names and cannot be repurposed). Backfill migration + sync-time write.
6. **`?source=leads|officernd|all` defaults to `all`** (back-compat). Frontend explicitly passes `leads` for the Lead Sources sections.
7. **No admin override** for membership-type classification in v1. If misclassifications surface in real data, add it later.

## Module Layout

```
backend/src/officernd-reports/
├── officernd-reports.module.ts      registers controller + service; imports OfficerndSync, Deal, User repos
├── officernd-reports.controller.ts  all new endpoints, all @Roles(Role.ADMIN)
├── officernd-reports.service.ts     query logic for dashboard + reports OfficeRnD endpoints
└── membership-type.classifier.ts    pure helper: classifyMembershipType(name) → OfficerndMembershipType
```

`AppModule` imports `OfficerndReportsModule`. Existing `dashboard` and `reports` modules unchanged structurally.

## Shared Enum

Add to `packages/shared/src/enums.ts` and re-export from `index.ts`:

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

## Database Schema

Migration `1779000000000-AddMembershipTypeClassToOfficerndSync.ts`:

1. `ALTER TABLE officernd_sync ADD COLUMN membership_type_class varchar`
2. `CREATE INDEX idx_officernd_sync_type_class ON officernd_sync(membership_type_class)` — charts group by this column.
3. **Backfill** via SQL `UPDATE officernd_sync SET membership_type_class = CASE ... END` that mirrors the helper's keyword rules. Self-contained — no app code dependency, idempotent.

Entity addition in `officernd-sync.entity.ts`:

```ts
@Index()
@Column({ name: "membership_type_class", type: "varchar", nullable: true })
membershipTypeClass: OfficerndMembershipType | null = null;
```

## Membership-Type Classifier

`backend/src/officernd-reports/membership-type.classifier.ts`:

```ts
import { OfficerndMembershipType } from "@arafat/shared";

export function classifyMembershipType(name: string | null): OfficerndMembershipType {
  if (!name) return OfficerndMembershipType.OTHERS;
  const lower = name.toLowerCase();

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

**Order matters.** `virtual` checked first prevents "Virtual Office" landing in OFFICE. `\btl\b` word-boundary prevents false positives like "settler" or "title". `flex` checked before `office` ensures "Flex Office" → COWORKING.

### Sync service touch (minimal — only edit to existing OfficeRnD sync code)

In `officernd.service.ts`, where `membershipType` is currently set on upsert:

```ts
existing.membershipTypeClass = classifyMembershipType(membershipType);
```

Same line in the new-row branch. No other changes to sync logic, per "out of scope" constraint.

## Backend Endpoints

### New endpoints (all `@Roles(Role.ADMIN)`)

| Route | Source query | Response shape |
|---|---|---|
| `GET /dashboard/officernd/assigned-by-staff` | `officernd_sync` rows where `status != 'PENDING'` and `assigned_to IS NOT NULL`, GROUP BY `assigned_to` | `[{ userId, userName, count }]` |
| `GET /dashboard/officernd/by-type` | `officernd_sync` rows where `status != 'IGNORED'`, GROUP BY `membership_type_class` | `[{ type: OfficerndMembershipType, count }]` |
| `GET /dashboard/officernd/win-loss` | `deals` where `officernd_sync_id IS NOT NULL`, aggregated by status | `{ won, lost, active, winRate }` |
| `GET /dashboard/officernd/lifecycle-summary` | `officernd_sync` rows GROUP BY `status` | `{ pending, assigned, pipelined, ignored }` |
| `GET /reports/officernd/staff-summary?month=YYYY-MM` | per `assigned_to`: `assigned`/`pipelined` counts from sync table; `won`/`lost` joined via `officernd_sync.deal_id → deals` | `[{ userId, userName, assigned, pipelined, won, lost, winRate }]` |
| `GET /reports/officernd/type-summary?month=YYYY-MM` | sync rows non-IGNORED, GROUP BY `membership_type_class` | `[{ type, count }]` |
| `GET /reports/officernd/win-loss?month=YYYY-MM` | deals where `officernd_sync_id IS NOT NULL`, GROUP BY owner, computed won/lost | `[{ userId, userName, won, lost, winRate }]` |

**Date scope:** the four `/reports/officernd/*` endpoints filter the month window on `officernd_sync.created_at` (when the renewal entered the system). Document this in Swagger.

**`winRate` formula** everywhere: `won + lost > 0 ? round(won / (won + lost) * 1000) / 10 : 0` — matches the existing formula in `reports.service.ts` exactly.

### Modified endpoints

| Route | Change | Default behavior |
|---|---|---|
| `GET /dashboard/stats` | adds `andWhere("deal.officernd_sync_id IS NULL")` to all internal queries | top cards become Leads-only |
| `GET /dashboard/by-source` | filters `client.source != 'OFFICERND_RENEWAL'` | source chart drops OfficeRnD slice |
| `GET /dashboard/by-location` | filters `deal.officernd_sync_id IS NULL` | location chart no longer skewed by all-`BARWA_ALSADD` defaults |
| `GET /reports/win-loss?source=leads\|officernd\|all` | new optional param | default `all` (back-compat) |
| `GET /reports/staff-performance?month&source=leads\|officernd\|all` | new optional param | default `all` |

`source=leads` → `deal.officernd_sync_id IS NULL`. `source=officernd` → `deal.officernd_sync_id IS NOT NULL`. `source=all` → no filter.

> **Naming note:** the source request mentioned `/reports/staff-summary` for the existing endpoint; the actual route is `/reports/staff-performance`. The spec uses the real route name. The new OfficeRnD-only endpoint is genuinely new and named `/reports/officernd/staff-summary`.

## Frontend

### Dashboard page (`DashboardPage.tsx`)

```
DashboardPage
├─ <h1>Dashboard Overview</h1>
├─ <SectionHeader>Lead Sources</SectionHeader>            (NEW heading)
│  ├─ Top stat cards row (5 cards — leads-only data, existing markup)
│  ├─ <Card>Deals by Location</Card> + <Card>Deals by Source</Card>
│  └─ <Card>Staff Win/Loss</Card> + <Card>Staff Win Rate</Card>
│
└─ {isAdmin && (                                          (NEW section, admin-gated)
   <OfficerndDashboardSection>
     <SectionHeader purple>OfficeRnD Renewals</SectionHeader>
     ├─ Lifecycle stat cards row (Pending / Assigned / Pipelined / Ignored)
     ├─ Win/Loss summary cards (Won / Lost / Active / Win Rate %)
     ├─ <Card>Membership Type Breakdown</Card> (donut)
     │  + <Card>Assigned Per Staff</Card> (horizontal bar)
     └─ <Card>Renewal Win/Loss by Staff</Card> (small bar chart)
   </OfficerndDashboardSection>
)}
```

The OfficeRnD section is a single sibling component (`OfficerndDashboardSection.tsx`) so it stays self-contained.

### New chart components in `frontend/src/components/charts/`

- `MembershipTypeChart.tsx` — donut. Color map: Office=`#3B82F6`, Virtual Office=`#8B5CF6`, Trade License=`#F59E0B`, Coworking=`#14B8A6`, Others=`#9CA3AF`. Empty state: "No renewals yet".
- `OfficerndAssignedByStaffChart.tsx` — horizontal bar.
- `OfficerndWinLossChart.tsx` — small grouped bar (won/lost/active) with win-rate label.

### New API client

`frontend/src/api/officernd-reports.ts` — typed wrappers for the seven new endpoints. Same axios pattern as `api/dashboard.ts` and `api/reports.ts`. Re-uses `OfficerndMembershipType` from `@arafat/shared`.

### Reports page (`ReportsPage.tsx`)

```
ReportsPage
├─ {isAdmin && <OverallSummarySection />}        (passes source="leads")
├─ {isAdmin && <StaffChartsSection />}            (passes source="leads")
├─ <LocationSourceSection />                      unchanged
├─ <SpaceTypeSection />                           unchanged
├─ <PipelineSection />                            unchanged
├─ <BrokerSection />                              unchanged
├─ {isAdmin && <OfficerndStaffSummarySection />}  NEW
├─ {isAdmin && <OfficerndTypeSummarySection />}   NEW
└─ {isAdmin && <OfficerndWinLossSection />}       NEW
```

Each new section is structurally identical to `OverallSummarySection.tsx`: month dropdown reusing the existing `MONTHS` constant pattern, `useExportPdf("OfficeRnD-...")` hook, `Card` wrapper with title + month selector + PDF button in the `action` slot, TanStack Query with loading/empty states.

The two **modified** existing sections (`OverallSummarySection`, `StaffChartsSection`) pass `source: "leads"` to their queries. `reportsApi.getStaffPerformance` and `reportsApi.getWinLoss` gain an optional `source?: "leads" | "officernd" | "all"` parameter.

### SALES role behavior

- DashboardPage: OfficeRnD section wrapped in `{isAdmin && (...)}`. SALES sees only Lead Sources.
- ReportsPage: new OfficeRnD sections wrapped in `{isAdmin && (...)}`. Existing sections that already filter to leads-only are admin-gated as they are today.
- Top stat cards already correspond to leads-only data because the backend filter is unconditional, so SALES sees coherent numbers without role-specific frontend logic.

### Color constants

Membership-type color map lives in `MembershipTypeChart.tsx` as a single exported `MEMBERSHIP_TYPE_COLORS` constant. The matching report-section donut imports the same constant — no duplication.

## Testing

### Backend unit tests — `membership-type.classifier.spec.ts`

Table-driven, ~14 cases:
- `null`, `""`, `"   "` → `OTHERS`
- `"Virtual Office"`, `"VIRTUAL OFFICE"`, `"Premium Virtual Plan"` → `VIRTUAL_OFFICE`
- `"Trade License"`, `"TL Standard"`, `"License Renewal"` → `TRADE_LICENSE`
- `"title insurance"`, `"settler benefits"` → `OTHERS` (verifies `\btl\b` word-boundary)
- `"Flex 5-Day"`, `"Coworking Pass"`, `"Hot Desk"`, `"Dedicated Desk"` → `COWORKING`
- `"Closed Office"`, `"Office Premium"` → `OFFICE`
- `"Flex Office"` → `COWORKING` (verifies precedence over OFFICE)
- `"Misc plan"` → `OTHERS`

### Backend e2e tests — `backend/test/officernd-reports.e2e-spec.ts`

Fixture: 1 admin + 2 sales users; 8 `officernd_sync` rows spread across all four lifecycle states and all five membership classes; 5 deals where 3 link to sync rows (1 won, 1 lost, 1 active) and 2 don't.

Assertions:
- All seven new endpoints return expected counts/shapes/win-rates.
- SALES JWT → 403 on every new endpoint.
- `?month=YYYY-MM` correctly excludes rows outside the window (verified by seeding a row outside the test month).

### Backend e2e tests for modified endpoints — new `backend/test/reports.e2e-spec.ts`

Five cases:
1. `GET /dashboard/by-source` — fixture mixes lead-source + OFFICERND_RENEWAL clients; response excludes the OFFICERND_RENEWAL bucket.
2. `GET /dashboard/stats` — fixture has both stream deals; numbers reflect leads only.
3. `GET /reports/win-loss?source=leads` — excludes OfficeRnD-linked deals.
4. `GET /reports/win-loss?source=officernd` — only OfficeRnD-linked deals.
5. `GET /reports/win-loss` (no param) — back-compat, returns full set.

### Frontend

No automated tests — the project has no dashboard/reports e2e coverage to extend.

Manual verification checklist (mirrors source request acceptance criteria):
1. `/dashboard` top cards reflect leads-only numbers.
2. `/dashboard` by-source chart no longer shows the OFFICERND_RENEWAL slice.
3. New OfficeRnD section visible only to admin users.
4. Membership-type donut classifies seeded plan names correctly.
5. `/reports` shows both leads-only sections (existing) and OfficeRnD sections (new).
6. Per-section PDF export works for every new widget.
7. SALES role sees zero OfficeRnD UI on either page.

## Acceptance Criteria

From the source request, all of the following must be true on completion:

- On `/dashboard`, the top stat cards and the by-source chart no longer include OfficeRnD renewal deals.
- On `/reports`, staff win/loss can be filtered to "Leads only", "OfficeRnD only", or "All" via the `source` query parameter.
- The membership type breakdown correctly classifies seeded OfficeRnD data.
- Per-section PDF export works on every new widget.
- All new endpoints have e2e test coverage in `backend/test/`.
