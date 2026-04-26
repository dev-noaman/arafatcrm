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

### Backend Impact

- No backend changes needed for this feature — the existing stage transition logic (`confirmTerminal` guard, auto status update, `mark-lost` endpoint) handles everything.

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

**calendar.controller.ts:**
- `GET /calendar/connect` — initiates OAuth flow
- `GET /calendar/oauth/callback` — handles OAuth redirect, stores tokens
- `GET /calendar/status` — returns whether current user has Google connected

**calendar.service.ts:**
- `getAuthClient(userId)` — builds authenticated Google API client, handles token refresh
- `createEvent(userId, eventDetails)` — creates Google Calendar event
- `updateEvent(userId, calendarEventId, eventDetails)` — updates existing event
- `deleteEvent(userId, calendarEventId)` — cancels calendar event

**calendar.entity.ts:**
- `GoogleToken` entity for `google_tokens` table

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
| `meeting_duration` | int | yes | 30 | Duration in minutes |
| `meeting_location` | varchar(500) | yes | null | Custom meeting location |
| `meeting_notes` | text | yes | null | Meeting agenda/notes |
| `calendar_event_id` | varchar(255) | yes | null | Google Calendar event ID |

### New Entity — GoogleToken (`google_tokens` table)

| Column | Type | Purpose |
|--------|------|---------|
| `id` | serial PK | Auto ID |
| `user_id` | int FK → users | Which user's token |
| `access_token` | text | Google access token |
| `refresh_token` | text | Google refresh token |
| `token_expiry` | timestamp | When access token expires |
| `scope` | varchar | Granted OAuth scopes |
| `created_at` | timestamp | When connected |
| `updated_at` | timestamp | Last token refresh |

### Migration

Single TypeORM migration adding all columns and the new table.

### Shared Package

No enum changes needed — `DealStage.WON`, `DealStage.LOST`, `DealStatus.won`, `DealStatus.lost` already exist.

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
- `backend/src/calendar/dto/schedule-meeting.dto.ts`
- `backend/src/deals/dto/schedule-meeting.dto.ts` (for meeting fields on deal update)

### Backend — Modify
- `backend/src/deals/deal.entity.ts` — add 6 meeting columns
- `backend/src/deals/deals.service.ts` — add meeting scheduling logic + calendar event creation
- `backend/src/deals/deals.controller.ts` — add schedule-meeting endpoint
- `backend/src/app.module.ts` — import CalendarModule
- `backend/package.json` — add `googleapis` dependency

### Frontend — Modify
- `frontend/src/pages/deals/PipelinePage.tsx` — add Won/Lost columns, WIN/LOSS buttons on Contract cards, Schedule Meeting modal on Meeting cards
- `frontend/src/api/deals.ts` — add schedule meeting API call
- `frontend/src/api/calendar.ts` — new calendar API client (connect, status)
- `frontend/src/types/deal.ts` — add meeting fields to Deal type

### Shared
- No changes needed

---

## Out of Scope

- Meeting reminders/notifications (relies on Google Calendar's own reminders)
- Recurring meetings
- Meeting attendees/invitations
- Multiple meetings per deal
- Drag-and-drop into Won/Lost columns (use buttons only)
- Retrospective calendar event creation after Google connection
