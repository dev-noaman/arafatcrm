# TidyCal Calendar Replacement Design

**Date:** 2026-04-28
**Status:** Approved
**Scope:** Replace Google Calendar integration with TidyCal for meeting scheduling in ArafatCRM.

---

## 1. Goals

- Remove Google Calendar (per-user OAuth2 + `googleapis` SDK) from the backend and frontend.
- Integrate TidyCal as the new calendar provider, supporting:
  1. **Direct booking** — staff picks a date/time and the CRM creates a TidyCal booking via API.
  2. **Booking link** — staff generates a TidyCal URL that the client uses to self-book.
- Maintain the existing user experience: the "Schedule Meeting" modal in the pipeline stays visually unchanged.

## 2. Non-Goals

- Webhook synchronization from TidyCal back to the CRM (Phase 2).
- Migrating historical Google Calendar event IDs — they become stale references and are harmless. Existing Google Calendar events are not cancelled or migrated; they remain in users' Google Calendars as orphaned events.
- Supporting multiple booking types per meeting — a single default booking type per user is sufficient for this CRM.

## 3. Architecture

### 3.1 Backend Module Changes

The `backend/src/calendar/` module is kept in place but its internals are fully replaced.

| File | Action | Details |
|------|--------|---------|
| `calendar.entity.ts` | Replace | `GoogleToken` → `TidyCalToken`. Stores `userId`, `accessToken`, `refreshToken`, `tokenExpiry`, `bookingTypeId`, `username`, `bookingTypeSlug`. |
| `calendar.service.ts` | Replace | Google OAuth + `googleapis` → TidyCal OAuth + REST API (native `fetch`). Methods documented in Section 3.4. |
| `calendar.controller.ts` | Update | Same 3 endpoints (`/connect`, `/oauth/callback`, `/status`). Add `GET /booking-types`, `PUT /default-booking-type`, `POST /booking-link`, `DELETE /connect`. |
| `calendar.module.ts` | Keep | Unchanged structure — still exports `CalendarService` for `DealsModule`. |

### 3.2 Deals Module Changes

`DealsService` continues to depend on `CalendarService`. The public method signatures in `DealsService` do not change, but the internal call sites are updated:

- `scheduleMeeting()` — saves local meeting fields, then calls `calendarService.createBooking()` or `calendarService.updateBooking()`.
- `cancelMeeting()` — clears local meeting fields, then calls `calendarService.cancelBooking()`.

Updated `DealsService.scheduleMeeting()` call site:
```ts
const title = `Meeting: ${clientName} - ${deal.title}`;
const startDate = new Date(`${dto.meetingDate}T${dto.meetingTime}:00`);
const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

if (deal.calendarEventId) {
  await this.calendarService.updateBooking(userId, deal.calendarEventId, {
    title,
    start: startDate,
    end: endDate,
    location: dto.meetingLocation,
    description: dto.meetingNotes,
  });
} else {
  const bookingId = await this.calendarService.createBooking(userId, {
    title,
    start: startDate,
    end: endDate,
    location: dto.meetingLocation,
    description: dto.meetingNotes,
    clientEmail: deal.client?.email,
    clientName: deal.client?.name,
  });
  if (bookingId) {
    deal.calendarEventId = bookingId;
  }
}
```

If the TidyCal API call throws, it is caught, logged with `Logger.error()`, and ignored — local data always persists.

### 3.3 Entity Changes

**`TidyCalToken`** (replaces `GoogleToken`):

```ts
@Entity("tidycal_tokens")
export class TidyCalToken {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "uuid", name: "user_id" }) userId!: string;
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" }) user!: User;
  @Column({ type: "text", name: "access_token" }) accessToken!: string;
  @Column({ type: "text", name: "refresh_token" }) refreshToken!: string;
  @Column({ type: "timestamp", name: "token_expiry" }) tokenExpiry!: Date;
  @Column({ type: "varchar", nullable: true, name: "booking_type_id" })
  bookingTypeId: string | null = null;
  @Column({ type: "varchar", nullable: true, name: "username" })
  username: string | null = null;
  @Column({ type: "varchar", nullable: true, name: "booking_type_slug" })
  bookingTypeSlug: string | null = null;
  @CreateDateColumn({ name: "created_at" }) createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at" }) updatedAt!: Date;
}
```

**`Deal`** — no column renames. `calendarEventId` now stores a TidyCal booking ID instead of a Google event ID. It remains an opaque external reference string.

### 3.4 CalendarService Public Interface

```ts
export class CalendarService {
  getAuthUrl(userId: string): string;
  async handleCallback(code: string, state: string): Promise<void>;
  async isConnected(userId: string): Promise<boolean>;
  async disconnect(userId: string): Promise<void>;
  async getBookingTypes(userId: string): Promise<{ id: string; name: string; slug: string }[]>;
  async setDefaultBookingType(userId: string, bookingTypeId: string): Promise<void>;
  async createBooking(userId: string, details: { title: string; start: Date; end: Date; location?: string; description?: string; clientEmail?: string; clientName?: string }): Promise<string | null>;
  async updateBooking(userId: string, bookingId: string, details: { title: string; start: Date; end: Date; location?: string; description?: string }): Promise<void>;
  async cancelBooking(userId: string, bookingId: string): Promise<void>;
  async generateBookingLink(userId: string, dealId: string): Promise<string>;
}
```

## 4. Data Flow

### 4.1 TidyCal OAuth Flow (Per User)

1. User clicks **Connect TidyCal** on `/profile`.
2. Frontend calls `GET /calendar/connect`.
3. Backend generates TidyCal OAuth URL with `state = base64(userId + ":" + hmac(userId, JWT_SECRET))`. The HMAC prevents state forgery.
4. User authenticates on TidyCal, redirected to `GET /calendar/oauth/callback` (`@Public()`).
5. Backend validates `state` by verifying the HMAC signature. If invalid, redirects to `/profile?calendar=error`.
6. Backend checks for `req.query.error` (e.g., `access_denied`). If present, redirects to `/profile?calendar=error`.
7. Backend exchanges `code` for access + refresh tokens, upserts into `tidycal_tokens`.
8. Backend calls TidyCal `/api/v1/me` to fetch the user's `username`.
9. Backend fetches user's booking types from TidyCal API and stores the first one as `bookingTypeId`, along with its `slug` as `bookingTypeSlug`.
10. Redirects to `/profile?calendar=connected`.

If fetching booking types or user profile fails after token exchange, the token is still saved but `bookingTypeId` remains null. The profile page shows a warning and allows retry.

### 4.2 Direct Booking Flow

1. Staff opens a deal in **Meeting** stage and picks date, time, and location.
2. Frontend calls `POST /deals/:id/schedule-meeting` with `ScheduleMeetingDto`.
3. `DealsService.scheduleMeeting()`:
   - Validates ownership (owner or ADMIN).
   - Saves `meetingDate`, `meetingTime`, `meetingLocation`, `meetingNotes` locally.
   - Calls `calendarService.createBooking(userId, details)` or `calendarService.updateBooking(userId, bookingId, details)`:
     - Gets valid access token (refreshes if expired).
     - Calls TidyCal API. The exact payload shape must be verified against TidyCal docs at implementation time.
     - Stores returned `bookingId` in `deal.calendarEventId`.
   - If TidyCal API fails, the error is logged and local data still saves. `calendarEventId` is **not** modified on update failure; on create failure it remains null.

### 4.3 Reschedule Flow

1. Staff changes date/time in the modal.
2. If `deal.calendarEventId` exists, call `calendarService.updateBooking()`.
3. If no booking ID exists, call `calendarService.createBooking()`.
4. If `updateBooking()` fails, the old `calendarEventId` is preserved (not nulled). The local meeting fields (date, time, location) are still updated to reflect the user's intent — this may create a temporary discrepancy between the CRM and TidyCal until a successful update occurs. This matches the current Google Calendar behavior.

### 4.4 Cancel Flow

1. Staff clicks **Cancel Meeting**.
2. If `deal.calendarEventId` exists, call `calendarService.cancelBooking()`.
3. Clear all local meeting fields regardless of API success.

### 4.5 Booking Link Flow

1. Staff clicks **Copy Booking Link** on a Meeting-stage card or in the deal modal.
2. Frontend calls `POST /calendar/booking-link` with `GenerateBookingLinkDto` (`{ dealId: string }`).
3. `CalendarController` validates the user owns the deal (or is ADMIN) via `DealsService.findOne()`.
4. `CalendarService.generateBookingLink()` constructs: `https://tidycal.com/{username}/{bookingTypeSlug}?email={clientEmail}&name={clientName}`.
5. Backend returns the URL; frontend copies it to clipboard.

If `username` or `bookingTypeSlug` is missing, throws a `BadRequestException` with message "TidyCal profile not fully configured. Please reconnect." The controller returns 400.

## 5. Frontend Changes

### 5.1 API Client (`frontend/src/api/calendar.ts`)

```ts
export const calendarApi = {
  getConnectUrl: () =>
    apiClient.get<{ url: string }>("/calendar/connect").then((r) => r.data),
  getStatus: () =>
    apiClient.get<{ connected: boolean }>("/calendar/status").then((r) => r.data),
  disconnect: () =>
    apiClient.delete("/calendar/connect").then((r) => r.data),
  getBookingTypes: () =>
    apiClient.get<{ id: string; name: string; slug: string }[]>("/calendar/booking-types").then((r) => r.data),
  setDefaultBookingType: (bookingTypeId: string) =>
    apiClient.put("/calendar/default-booking-type", { bookingTypeId }).then((r) => r.data),
  generateBookingLink: (dealId: string) =>
    apiClient.post<{ url: string }>("/calendar/booking-link", { dealId }).then((r) => r.data),
};
```

### 5.2 Profile Page (`frontend/src/pages/profile/ProfilePage.tsx`)

- Replace the **Google Calendar** section with **TidyCal**.
- After connecting, fetch `bookingTypes` and show a dropdown to select the default booking type.
- Persist selection via `setDefaultBookingType`.
- Add a **Disconnect** button that calls `calendarApi.disconnect()`.
- Handle URL params `?calendar=connected` and `?calendar=error`.
- If user is connected but has no booking types, show a warning: "No booking types found in your TidyCal account. Please create one at tidycal.com."

### 5.3 Pipeline Page (`frontend/src/pages/deals/PipelinePage.tsx`)

- **Schedule Meeting modal** — no visual changes. The date/time picker, location dropdown, and notes field stay identical.
- **Meeting-stage cards** — add a secondary **Copy Booking Link** button. On click:
  - Call `calendarApi.generateBookingLink(deal.id)`.
  - `navigator.clipboard.writeText(url)`.
  - Show toast: "Booking link copied to clipboard".
- If the current user is not connected to TidyCal, the "Copy Booking Link" button is hidden or disabled with a tooltip: "Connect TidyCal in your profile to generate booking links."

## 6. Database Migration

### 6.1 Migration: `RemoveGoogleTokensAddTidyCalTokens`

```sql
-- Create new TidyCal tokens table first (safer ordering)
CREATE TABLE tidycal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP NOT NULL,
  booking_type_id VARCHAR(255),
  username VARCHAR(255),
  booking_type_slug VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);

-- Drop old Google tokens table
DROP TABLE IF EXISTS google_tokens;
```

**Down migration:**
```sql
DROP TABLE IF EXISTS tidycal_tokens;

CREATE TABLE google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP NOT NULL,
  scope VARCHAR(255),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id)
);
```

### 6.2 Deal Table

No column changes. `calendar_event_id` continues to store an opaque external booking ID. Historical Google event IDs are harmless stale strings.

### 6.3 Import Cleanup

Grep for all `GoogleToken` imports across the backend and update them to `TidyCalToken`. Known locations:
- `backend/src/calendar/calendar.service.ts`
- `backend/src/calendar/calendar.module.ts`
- Any test files referencing `GoogleToken`

## 7. Environment Variables

**Remove:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

**Add:**
- `TIDYCAL_CLIENT_ID`
- `TIDYCAL_CLIENT_SECRET`
- `TIDYCAL_REDIRECT_URI` (same path as before: `https://arafatcrm.cloud/api/v1/calendar/oauth/callback`)

**Update:**
- `backend/.env.example`
- `Deploy-to-VPS.ps1`

## 8. Error Handling

| Scenario | Behavior |
|----------|----------|
| TidyCal API down during schedule | Meeting saves locally. API error is logged via `Logger.error()` and silently caught. |
| Token refresh fails (revoked access) | Token row deleted. `isConnected()` returns false. Next schedule skips API. User must reconnect. |
| User not connected to TidyCal | `scheduleMeeting()` skips API call entirely. Meeting saves locally only. |
| No booking type configured | Fallback to user's first available TidyCal booking type. If none exist, skip API. Profile page shows a warning banner. |
| Deal deleted while TidyCal booking exists | TidyCal booking is orphaned. Same behavior as current Google integration. |
| Booking link generation with missing username/slug | Returns 400 with message "TidyCal profile not fully configured. Please reconnect." |
| OAuth callback with `error` query param | Redirects to `/profile?calendar=error` without attempting token exchange. |
| Invalid `state` parameter in OAuth callback | Redirects to `/profile?calendar=error`. |

### 8.1 Security Notes

- **State parameter signing:** The OAuth `state` is signed with an HMAC using `JWT_SECRET` to prevent forgery. The callback verifies the signature before processing.
- **Token storage:** Access and refresh tokens are stored as plain text in PostgreSQL, identical to the current Google integration. Encrypting tokens at rest is a known enhancement but out of scope for this migration.
- **Deal ownership on booking link:** `POST /calendar/booking-link` enforces deal ownership via `DealsService.findOne()`, which applies SALES scoping.

## 9. Cleanup

- Remove `googleapis` from `backend/package.json`.
- Remove `google-auth-library` if it was added as a direct dependency (for the `Auth.OAuth2Client` type).
- Remove `@types/googleapis` if present.
- No new npm package is required; use native `fetch` (Node 18+).
- Update `Deploy-to-VPS.ps1` to use `TIDYCAL_*` variables instead of `GOOGLE_*`.
- Update `backend/.env.example`.
- Update `CLAUDE.md` to document TidyCal instead of Google Calendar.

## 10. Testing Plan

1. **OAuth flow:** Connect TidyCal from profile page, verify token stored, verify redirect.
2. **OAuth security:** Attempt callback with forged `state`, verify redirect to error page.
3. **OAuth error handling:** Deny TidyCal auth, verify redirect to `/profile?calendar=error`.
4. **Direct booking:** Schedule meeting on a deal, verify TidyCal booking created, verify `calendarEventId` populated.
5. **Reschedule:** Change meeting time, verify TidyCal booking updated.
6. **Cancel:** Cancel meeting, verify TidyCal booking cancelled, verify local fields cleared.
7. **Booking link:** Click "Copy Booking Link", verify URL generated with pre-filled client data.
8. **Offline fallback:** Disconnect TidyCal, schedule meeting, verify local data saves without error.
9. **Token refresh:** Simulate expired token, verify refresh token is used to obtain new access token, verify API call succeeds.
10. **Permissions:** Verify SALES user can only schedule meetings on their own deals.
11. **Zero booking types:** Connect TidyCal account with no booking types, verify warning banner shown on profile page.
