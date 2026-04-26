# Pipeline Won/Lost Columns + Meeting Scheduling with Google Calendar

**Date:** 2026-04-26
**Status:** Approved

## Overview

Two enhancements to the pipeline kanban board:

1. **Won/Lost columns** — Add terminal-stage columns and inline WIN/LOSS buttons on Contract-stage cards.
2. **Meeting scheduling** — Date/time picker for deals in the Meeting stage, integrated with Google Calendar.

---

## Feature 1: Won/Lost Pipeline Columns

### Board Layout Change

**Current:** 6 columns (New, Qualified, Meeting, Proposal, Negotiation, Contract)
**New:** 8 columns — add **Won** (green header) and **Lost** (red header) after Contract.

### Contract Card Buttons

- Each Contract-stage card gets two small buttons at the bottom:
  - Green **WIN** button
  - Red **LOSS** button
- Clicking **WIN** calls `PUT /deals/:id` with `{ stage: "WON", confirmTerminal: true }`. Card moves to Won column.
- Clicking **LOSS** opens a small modal asking for a loss reason (required field), then calls `POST /deals/:id/mark-lost` with `{ reason }`. Card moves to Lost column.

### Won Column

- Green-toned header and cards
- Shows deal value prominently
- Cards are read-only (no drag-out, no edit) — terminal state
- Displays client name, company, deal value

### Lost Column

- Red-toned header and cards
- Shows loss reason below the deal info
- Cards are read-only — terminal state
- Displays client name, company, deal value, loss reason

### Filtering

- Won and Lost columns are filterable — can be toggled visible/hidden to manage board width
- Default: both visible

### Backend Changes Required

- **Fix `markAsLost` method** — Current `POST /deals/:id/mark-lost` sets `status = "lost"` and `isLost = true` but does NOT set `stage = "LOST"`. Must add `deal.stage = DealStage.LOST` and append to `stageHistory` so the card appears in the Lost column.
- **Frontend data fetching** — Current pipeline query fetches only `status: "active"` and filters out `stage !== "WON" && stage !== "LOST"`. Must change to fetch all deals (active + won + lost) and bucket them into the 8 columns client-side.

---

## Feature 2: Meeting Scheduling

### Trigger

When a deal enters the **Meeting** stage, the card displays a **"Schedule Meeting"** button.

### Schedule Meeting Modal

Fields:

- **Date picker** — restricted to Sunday through Thursday only (gray out Fri/Sat)
- **Time picker** — 30-minute slots from 08:30 to 17:00 (last slot ends at 17:30)
- **Duration** — fixed at 30 minutes
- **Location** — free-text input (not tied to deal's location field)
- **Notes** — optional textarea for meeting agenda/purpose
- **Client name + deal info** — shown read-only at top for context

### On Save

1. Backend saves meeting fields to the deal entity (`meetingDate`, `meetingTime`, `meetingDuration`, `meetingLocation`, `meetingNotes`)
2. Backend calls Google Calendar API to create an event
3. Backend stores the returned `calendarEventId` on the deal
4. Card in Meeting column updates to show scheduled date/time and a calendar icon

### Rescheduling

Clicking "Schedule Meeting" on an already-scheduled deal pre-fills the modal with existing values. Saving updates both the deal record and the Google Calendar event (via `calendarEventId`).

### Meeting Card Display

Meeting-stage cards show:
- Scheduled date and time (e.g., "Sun, Apr 27 at 10:00 AM")
- Location text
- Small calendar icon
- "Schedule Meeting" button changes to "Reschedule" when meeting exists

---

## Feature 3: Google Calendar Integration

### OAuth2 Setup (One-Time Admin Action)

- New `calendar/` NestJS module
- Admin visits `GET /api/v1/calendar/connect` → redirects to Google consent screen
- Google redirects back to `GET /api/v1/calendar/oauth/callback?code=...` → backend exchanges code for tokens
- Tokens stored in `google_tokens` table

### Required Environment Variables

```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_REDIRECT_URI=https://arafatcrm.cloud/api/v1/calendar/oauth/callback
```

### Calendar Module Structure

**calendar.controller.ts** (all paths prefixed with `/api/v1` via global prefix):
- `GET /calendar/connect` — requires `JwtAuthGuard`. Returns `{ url: "<google-oauth-url>" }` so the frontend can redirect the browser. Frontend opens this URL in a new tab/window.
- `GET /calendar/oauth/callback` — public endpoint (no JWT). Handles Google redirect, exchanges code for tokens, stores them, redirects to frontend settings page with success/error query param.
- `GET /calendar/status` — requires `JwtAuthGuard`. Returns `{ connected: boolean }`.

**calendar.service.ts:**
- `getAuthClient(userId)` — builds authenticated Google API client, handles token refresh
- `createEvent(userId, eventDetails)` — creates Google Calendar event
- `updateEvent(userId, calendarEventId, eventDetails)` — updates existing event
- `deleteEvent(userId, calendarEventId)` — cancels calendar event

**calendar.entity.ts:**
- `GoogleToken` entity for `google_tokens` table

### Meeting Scheduling API

**Endpoint:** `POST /deals/:id/schedule-meeting`
**Auth:** `JwtAuthGuard` (any authenticated user can schedule)
**DTO (`ScheduleMeetingDto`):**
- `meetingDate` — date string (required)
- `meetingTime` — time string HH:mm (required)
- `meetingLocation` — string, max 500 chars (required)
- `meetingNotes` — string, optional

**Behavior:**
1. Validates the deal exists and the user is the owner or admin
2. Saves meeting fields to the deal entity
3. If Google Calendar is connected for this user, creates/updates calendar event
4. Returns updated deal

**Endpoint:** `DELETE /deals/:id/schedule-meeting`
**Auth:** `JwtAuthGuard`
**Behavior:** Clears meeting fields, cancels Google Calendar event if `calendarEventId` exists.

### Role Restrictions

- **Meeting scheduling:** Any authenticated user who is the deal owner or an admin
- **Google Calendar connect:** Admin only (`@Roles(Role.ADMIN)`). Single org-wide Google account — all scheduled meetings go to one calendar.
- **Google Calendar status:** Any authenticated user

### Event Details

- **Title:** `Meeting: {client name} - {deal title}`
- **Start:** `{meetingDate}T{meetingTime}`
- **End:** start + 30 minutes
- **Location:** `{meetingLocation}` from the modal
- **Description:** `{meetingNotes}`
- **Attendees:** none by default (could add later)

### Graceful Degradation

If Google is not connected (no token), meeting details still save to the deal locally. The card shows a warning badge indicating the calendar event was not created. Admin can connect Google later and existing meetings won't retroactively create events.

### Token Refresh

Access tokens expire (~1 hour). The service checks expiry before each API call and uses the refresh token to get a new access token automatically. No user interaction needed.

---

## Data Model Changes

### Deal Entity — New Columns

| Column | Type | Nullable | Default | Purpose |
|--------|------|----------|---------|---------|
| `meeting_date` | date | yes | null | Scheduled meeting date |
| `meeting_time` | time | yes | null | Scheduled meeting time |
| `meeting_duration` | int | yes | 30 | Duration in minutes (fixed 30, column for future flexibility) |
| `meeting_location` | varchar(500) | yes | null | Custom meeting location |
| `meeting_notes` | text | yes | null | Meeting agenda/notes |
| `calendar_event_id` | varchar(255) | yes | null | Google Calendar event ID |

### New Entity — GoogleToken (`google_tokens` table)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid PK | Auto-generated UUID |
| `user_id` | uuid FK → users | Which user's token |
| `access_token` | text | Google access token |
| `refresh_token` | text | Google refresh token |
| `token_expiry` | timestamp | When access token expires |
| `scope` | varchar | Granted OAuth scopes |
| `created_at` | timestamp | When connected |
| `updated_at` | timestamp | Last token refresh |

### Migration

Single TypeORM migration adding all columns and the new table.

### Shared Package

No new enums needed — `DealStage.WON`, `DealStage.LOST`, `DealStatus.won`, `DealStatus.lost` already exist. However, the `PIPELINE_STAGES` constant in `packages/shared/src/enums.ts` currently excludes WON and LOST. Update it to include all 8 stages so consumers have a single source of truth. The frontend `PipelinePage.tsx` has its own hardcoded array that will also be updated to 8 stages.

---

## Dependencies

- `googleapis` npm package (backend) — official Google API client for Calendar API
- Google Cloud project with Calendar API enabled and OAuth2 credentials configured

## Files to Create/Modify

### Backend — New
- `backend/src/calendar/calendar.module.ts`
- `backend/src/calendar/calendar.controller.ts`
- `backend/src/calendar/calendar.service.ts`
- `backend/src/calendar/calendar.entity.ts`
- `backend/src/deals/dto/schedule-meeting.dto.ts` — DTO for `POST /deals/:id/schedule-meeting`

### Backend — Modify
- `backend/src/deals/deal.entity.ts` — add 6 meeting columns
- `backend/src/deals/deals.service.ts` — fix `markAsLost` to set `stage = "LOST"`, add meeting scheduling logic + calendar event creation/deletion
- `backend/src/deals/deals.controller.ts` — add `POST /deals/:id/schedule-meeting` and `DELETE /deals/:id/schedule-meeting` endpoints
- `backend/src/app.module.ts` — import CalendarModule
- `backend/package.json` — add `googleapis` dependency

### Frontend — Modify
- `frontend/src/pages/deals/PipelinePage.tsx` — add Won/Lost columns, WIN/LOSS buttons on Contract cards, Schedule Meeting modal on Meeting cards, update data fetching to include won/lost deals
- `frontend/src/api/deals.ts` — add schedule/delete meeting API calls
- `frontend/src/api/calendar.ts` — new calendar API client (connect, status)
- `frontend/src/types/deal.ts` — add meeting fields to Deal type

### Shared
- `packages/shared/src/enums.ts` — update `PIPELINE_STAGES` to include all 8 stages

---

## Out of Scope

- Meeting reminders/notifications (relies on Google Calendar's own reminders)
- Recurring meetings
- Meeting attendees/invitations
- Multiple meetings per deal
- Drag-and-drop into Won/Lost columns (use buttons only)
- Retrospective calendar event creation after Google connection
- Token encryption at rest (v1 stores plain text; encrypt in future iteration)
- Cancelling Google Calendar event when deal moves out of Meeting stage (event stays on calendar unless manually deleted via `DELETE /deals/:id/schedule-meeting`)
