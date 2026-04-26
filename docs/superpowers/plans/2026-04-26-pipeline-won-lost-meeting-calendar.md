# Pipeline Won/Lost Columns + Meeting Scheduling Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Won/Lost terminal columns to the pipeline kanban with inline WIN/LOSS buttons on Contract cards, and add meeting scheduling with Google Calendar integration for deals in the Meeting stage.

**Architecture:** Backend gets a new `calendar` module for Google OAuth + Calendar API. Deal entity gains 6 meeting columns. `markAsLost` is fixed to set `stage = "LOST"`. Frontend pipeline expands to 8 columns and adds a Schedule Meeting modal for Meeting-stage cards.

**Tech Stack:** NestJS, TypeORM, `googleapis` npm package, React, TanStack Query, Vite

**Spec:** `docs/superpowers/specs/2026-04-26-pipeline-won-lost-meeting-scheduling-design.md`

---

## Task 1: Fix `markAsLost` backend bug

**Files:**
- Modify: `backend/src/deals/deals.service.ts` (lines 157-168)

The existing `markAsLost` method sets `status = "lost"` but never sets `stage = "LOST"` or updates `stageHistory`. Without this, lost deals won't appear in the Lost column.

- [ ] **Step 1: Fix `markAsLost` to set stage and history**

In `backend/src/deals/deals.service.ts`, update the `markAsLost` method (lines 157-168) to add stage update:

```typescript
async markAsLost(id: string, reason: string, userId: string, userRole: string) {
  const deal = await this.findOne(id, userId, userRole);
  if (deal.owner.id !== userId && userRole !== "ADMIN") {
    throw new ForbiddenException("Only deal owner or admin can mark as lost");
  }
  deal.isLost = true;
  deal.lossReason = reason;
  deal.status = DealStatus.LOST;
  deal.stage = DealStage.LOST;
  if (!deal.stageHistory.includes(DealStage.LOST)) {
    deal.stageHistory = [...deal.stageHistory, DealStage.LOST];
  }
  return this.dealsRepo.save(deal);
}
```

- [ ] **Step 2: Verify fix compiles**

Run: `pnpm --filter backend test`
Expected: All existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/deals/deals.service.ts
git commit -m "fix: set stage=LOST in markAsLost so deals appear in lost column"
```

---

## Task 2: Add meeting columns to deal entity + GoogleToken entity + generate migration

**Files:**
- Modify: `backend/src/deals/deal.entity.ts` (after line 84)
- Create: `backend/src/calendar/calendar.entity.ts`
- Create: migration file (auto-generated)

Both entity changes go in a single migration to match the spec.

- [ ] **Step 1: Add 6 meeting columns to deal entity**

In `backend/src/deals/deal.entity.ts`, add after the `officerndSync` relation (after line 84):

```typescript
@Column({ type: "date", nullable: true, name: "meeting_date" })
meetingDate!: string | null;

@Column({ type: "time", nullable: true, name: "meeting_time" })
meetingTime!: string | null;

@Column({ type: "int", nullable: true, default: 30, name: "meeting_duration" })
meetingDuration!: number | null;

@Column({ type: "varchar", length: 500, nullable: true, name: "meeting_location" })
meetingLocation!: string | null;

@Column({ type: "text", nullable: true, name: "meeting_notes" })
meetingNotes!: string | null;

@Column({ type: "varchar", length: 255, nullable: true, name: "calendar_event_id" })
calendarEventId!: string | null;
```

- [ ] **Step 2: Create GoogleToken entity**

Create `backend/src/calendar/calendar.entity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "../users/user.entity";

@Entity("google_tokens")
export class GoogleToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", name: "user_id" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ type: "text", name: "access_token" })
  accessToken!: string;

  @Column({ type: "text", name: "refresh_token" })
  refreshToken!: string;

  @Column({ type: "timestamp", name: "token_expiry" })
  tokenExpiry!: Date;

  @Column({ type: "varchar", nullable: true })
  scope!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
```

- [ ] **Step 3: Generate single migration for both**

Run: `pnpm --filter backend migration:generate -- -d ./typeorm.config.ts src/migrations/AddMeetingFieldsAndGoogleTokens`
Expected: Migration generated with `ADD COLUMN` for 6 meeting fields + `CREATE TABLE google_tokens`.

- [ ] **Step 4: Run migration**

Run: `pnpm --filter backend migration:run`
Expected: Migration applies successfully.

- [ ] **Step 5: Commit**

```bash
git add backend/src/deals/deal.entity.ts backend/src/calendar/calendar.entity.ts backend/src/migrations/
git commit -m "feat: add meeting fields to deal entity and google_tokens table"
```

---

## Task 3: Create calendar module (service, controller, module)

**Files:**
- Create: `backend/src/calendar/calendar.service.ts`
- Create: `backend/src/calendar/calendar.controller.ts`
- Create: `backend/src/calendar/calendar.module.ts`
- Modify: `backend/src/app.module.ts` (add CalendarModule import)
- Modify: `backend/package.json` (add `googleapis` dependency)

**Important codebase conventions:**
- `Roles` and `Public` decorators come from `../common/decorators` (not `../auth/roles.decorator`)
- `@Public()` is required on endpoints that bypass the global `JwtGuard` — see `auth.controller.ts` line 13
- `JwtGuard` is global (`APP_GUARD` in `app.module.ts` line 62-63) — do NOT use `@UseGuards(JwtAuthGuard)` on individual endpoints
- Calendar events must include `timeZone: "Asia/Qatar"` (Qatar is UTC+3, no DST)

- [ ] **Step 1: Install googleapis**

Run: `cd backend && pnpm add googleapis`

- [ ] **Step 2: Create calendar service**

Create `backend/src/calendar/calendar.service.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { google } from "googleapis";
import { ConfigService } from "@nestjs/config";
import { GoogleToken } from "./calendar.entity";
import { User } from "../users/user.entity";

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(GoogleToken)
    private tokenRepo: Repository<GoogleToken>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private config: ConfigService,
  ) {}

  getAuthUrl(): string {
    const oauthClient = this.createOAuthClient();
    return oauthClient.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar.events"],
      prompt: "consent",
    });
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    const oauthClient = this.createOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    if (!tokens.refresh_token || !tokens.access_token) {
      throw new Error("Google OAuth did not return required tokens");
    }
    await this.tokenRepo.upsert(
      {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date!),
        scope: tokens.scope ?? null,
      },
      ["userId"],
    );
  }

  async handleCallbackAsAdmin(code: string): Promise<void> {
    const admin = await this.userRepo.findOne({ where: { role: "ADMIN" } });
    if (!admin) throw new Error("No admin user found");
    await this.handleCallback(code, admin.id);
  }

  async isConnected(userId: string): Promise<boolean> {
    const count = await this.tokenRepo.count({ where: { userId } });
    return count > 0;
  }

  async getAuthClient(userId: string) {
    const tokenRow = await this.tokenRepo.findOne({ where: { userId } });
    if (!tokenRow) return null;

    const oauthClient = this.createOAuthClient();
    oauthClient.setCredentials({
      access_token: tokenRow.accessToken,
      refresh_token: tokenRow.refreshToken,
      expiry_date: tokenRow.tokenExpiry.getTime(),
    });

    if (tokenRow.tokenExpiry <= new Date()) {
      const { credentials } = await oauthClient.refreshAccessToken();
      tokenRow.accessToken = credentials.access_token!;
      tokenRow.tokenExpiry = new Date(credentials.expiry_date!);
      await this.tokenRepo.save(tokenRow);
      oauthClient.setCredentials(credentials);
    }

    return oauthClient;
  }

  async createEvent(userId: string, details: {
    title: string;
    start: Date;
    end: Date;
    location?: string;
    description?: string;
  }): Promise<string | null> {
    const auth = await this.getAuthClient(userId);
    if (!auth) return null;

    const calendar = google.calendar({ version: "v3", auth });
    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: details.title,
        location: details.location,
        description: details.description,
        start: { dateTime: details.start.toISOString(), timeZone: "Asia/Qatar" },
        end: { dateTime: details.end.toISOString(), timeZone: "Asia/Qatar" },
      },
    });
    return event.data.id ?? null;
  }

  async updateEvent(userId: string, eventId: string, details: {
    title: string;
    start: Date;
    end: Date;
    location?: string;
    description?: string;
  }): Promise<void> {
    const auth = await this.getAuthClient(userId);
    if (!auth) return;

    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: details.title,
        location: details.location,
        description: details.description,
        start: { dateTime: details.start.toISOString(), timeZone: "Asia/Qatar" },
        end: { dateTime: details.end.toISOString(), timeZone: "Asia/Qatar" },
      },
    });
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const auth = await this.getAuthClient(userId);
    if (!auth) return;

    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({ calendarId: "primary", eventId });
  }

  private createOAuthClient() {
    return new google.auth.OAuth2(
      this.config.get("GOOGLE_CLIENT_ID"),
      this.config.get("GOOGLE_CLIENT_SECRET"),
      this.config.get("GOOGLE_REDIRECT_URI"),
    );
  }
}
```

- [ ] **Step 3: Create calendar controller**

Create `backend/src/calendar/calendar.controller.ts`:

```typescript
import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { CalendarService } from "./calendar.service";
import { Roles, Public } from "../common/decorators";
import { Role } from "@arafat/shared";

@Controller("calendar")
export class CalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get("connect")
  @Roles(Role.ADMIN)
  getConnectUrl() {
    const url = this.calendarService.getAuthUrl();
    return { url };
  }

  @Public()
  @Get("oauth/callback")
  async handleCallback(@Req() req: Request, @Res() res: Response) {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect(`${process.env.CORS_ORIGIN}/settings?calendar=error`);
    }
    try {
      await this.calendarService.handleCallbackAsAdmin(code);
      return res.redirect(`${process.env.CORS_ORIGIN}/settings?calendar=connected`);
    } catch {
      return res.redirect(`${process.env.CORS_ORIGIN}/settings?calendar=error`);
    }
  }

  @Get("status")
  async getStatus(@Req() req: Request) {
    const userId = (req.user as any).id;
    const connected = await this.calendarService.isConnected(userId);
    return { connected };
  }
}
```

Key notes:
- `@Public()` on `oauth/callback` bypasses the global `JwtGuard` (Google redirects without JWT)
- `@Roles(Role.ADMIN)` on `connect` restricts to admins
- `status` uses global `JwtGuard` (no decorator needed)
- No `@UseGuards(JwtAuthGuard)` — the global guard handles auth

- [ ] **Step 4: Create calendar module**

Create `backend/src/calendar/calendar.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GoogleToken } from "./calendar.entity";
import { CalendarService } from "./calendar.service";
import { CalendarController } from "./calendar.controller";
import { User } from "../users/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([GoogleToken, User])],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
```

- [ ] **Step 5: Register CalendarModule in app**

In `backend/src/app.module.ts`, add import:

```typescript
import { CalendarModule } from "./calendar/calendar.module";
```

And add `CalendarModule` to the `imports` array (around line 55, after `OfficerndModule`).

- [ ] **Step 6: Verify compilation**

Run: `pnpm --filter backend test`

- [ ] **Step 7: Commit**

```bash
git add backend/src/calendar/ backend/src/app.module.ts backend/package.json backend/pnpm-lock.yaml
git commit -m "feat: add calendar module with Google OAuth and Calendar API"
```

---

## Task 4: Add schedule-meeting backend endpoints

**Files:**
- Create: `backend/src/deals/dto/schedule-meeting.dto.ts`
- Modify: `backend/src/deals/deals.service.ts` (inject CalendarService, add `scheduleMeeting` and `cancelMeeting` methods)
- Modify: `backend/src/deals/deals.controller.ts` (add 2 new endpoints)
- Modify: `backend/src/deals/deals.module.ts` (import CalendarModule)

- [ ] **Step 1: Create schedule-meeting DTO**

Create `backend/src/deals/dto/schedule-meeting.dto.ts`:

```typescript
import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ScheduleMeetingDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  meetingDate!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  meetingTime!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  meetingLocation!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  meetingNotes?: string;
}
```

- [ ] **Step 2: Import CalendarModule in DealsModule**

In `backend/src/deals/deals.module.ts`, add `CalendarModule` to the imports array:

```typescript
import { CalendarModule } from "../calendar/calendar.module";
// ...
imports: [
  TypeOrmModule.forFeature([Deal]),
  CalendarModule,
  // ... existing imports
],
```

- [ ] **Step 3: Add scheduleMeeting and cancelMeeting to deals service**

In `backend/src/deals/deals.service.ts`, inject `CalendarService` into the existing constructor. The current constructor (line 19-22) is:

```typescript
constructor(
  @InjectRepository(Deal)
  private dealsRepo: Repository<Deal>,
) {}
```

Change to:

```typescript
constructor(
  @InjectRepository(Deal)
  private dealsRepo: Repository<Deal>,
  private calendarService: CalendarService,
) {}
```

Add imports at top of file:

```typescript
import { CalendarService } from "../calendar/calendar.service";
import { ScheduleMeetingDto } from "./dto/schedule-meeting.dto";
```

Add these methods at the end of the class:

```typescript
async scheduleMeeting(
  id: string,
  dto: ScheduleMeetingDto,
  userId: string,
  userRole: string,
) {
  const deal = await this.findOne(id, userId, userRole);
  if (deal.owner.id !== userId && userRole !== "ADMIN") {
    throw new ForbiddenException("Only deal owner or admin can schedule meetings");
  }

  deal.meetingDate = dto.meetingDate;
  deal.meetingTime = dto.meetingTime;
  deal.meetingDuration = 30;
  deal.meetingLocation = dto.meetingLocation;
  deal.meetingNotes = dto.meetingNotes ?? null;

  try {
    const clientName = deal.client?.name ?? "Unknown Client";
    const title = `Meeting: ${clientName} - ${deal.title}`;
    const startDate = new Date(`${dto.meetingDate}T${dto.meetingTime}:00`);
    const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

    if (deal.calendarEventId) {
      await this.calendarService.updateEvent(userId, deal.calendarEventId, {
        title,
        start: startDate,
        end: endDate,
        location: dto.meetingLocation,
        description: dto.meetingNotes,
      });
    } else {
      const eventId = await this.calendarService.createEvent(userId, {
        title,
        start: startDate,
        end: endDate,
        location: dto.meetingLocation,
        description: dto.meetingNotes,
      });
      if (eventId) {
        deal.calendarEventId = eventId;
      }
    }
  } catch {
    // Calendar not connected or error — meeting still saved locally
  }

  return this.dealsRepo.save(deal);
}

async cancelMeeting(id: string, userId: string, userRole: string) {
  const deal = await this.findOne(id, userId, userRole);
  if (deal.owner.id !== userId && userRole !== "ADMIN") {
    throw new ForbiddenException("Only deal owner or admin can cancel meetings");
  }

  if (deal.calendarEventId) {
    try {
      await this.calendarService.deleteEvent(userId, deal.calendarEventId);
    } catch {
      // Calendar error — still clear locally
    }
  }

  deal.meetingDate = null;
  deal.meetingTime = null;
  deal.meetingDuration = null;
  deal.meetingLocation = null;
  deal.meetingNotes = null;
  deal.calendarEventId = null;

  return this.dealsRepo.save(deal);
}
```

- [ ] **Step 4: Add controller endpoints**

In `backend/src/deals/deals.controller.ts`, add two new endpoints after the `mark-lost` endpoint (after line 63). Follow existing patterns: use `@Req() req: Request` for user extraction (already used in other endpoints).

```typescript
@Post(":id/schedule-meeting")
async scheduleMeeting(
  @Param("id", ParseUUIDPipe) id: string,
  @Body() dto: ScheduleMeetingDto,
  @Req() req: Request,
) {
  const userId = (req.user as any).id;
  const userRole = (req.user as any).role;
  return this.dealsService.scheduleMeeting(id, dto, userId, userRole);
}

@Delete(":id/schedule-meeting")
async cancelMeeting(
  @Param("id", ParseUUIDPipe) id: string,
  @Req() req: Request,
) {
  const userId = (req.user as any).id;
  const userRole = (req.user as any).role;
  return this.dealsService.cancelMeeting(id, userId, userRole);
}
```

Add import:
```typescript
import { ScheduleMeetingDto } from "./dto/schedule-meeting.dto";
```

- [ ] **Step 5: Verify compilation**

Run: `pnpm --filter backend test`

- [ ] **Step 6: Commit**

```bash
git add backend/src/deals/
git commit -m "feat: add schedule-meeting and cancel-meeting endpoints"
```

---

## Task 5: Update frontend types + API clients

**Files:**
- Modify: `frontend/src/types/deal.ts` (add meeting fields to Deal interface)
- Create: `frontend/src/api/calendar.ts`
- Modify: `frontend/src/api/deals.ts` (add schedule/cancel meeting functions)
- Modify: `packages/shared/src/enums.ts` (update PIPELINE_STAGES)

**Important:** Frontend API clients import from `@/lib/api-client` (NOT `./axios`). See `frontend/src/api/deals.ts` line 1.

- [ ] **Step 1: Update shared PIPELINE_STAGES**

In `packages/shared/src/enums.ts` (lines 44-52), update to include WON and LOST:

```typescript
export const PIPELINE_STAGES: DealStage[] = [
  DealStage.NEW,
  DealStage.QUALIFIED,
  DealStage.MEETING,
  DealStage.PROPOSAL,
  DealStage.NEGOTIATION,
  DealStage.CONTRACT,
  DealStage.WON,
  DealStage.LOST,
];
```

Note: Removed `LEAD` from the shared constant since the frontend normalizes `"lead"` to `"new"` and never displays a Lead column. The shared constant now matches what the pipeline board actually renders.

- [ ] **Step 2: Add meeting fields to frontend Deal type**

In `frontend/src/types/deal.ts`, add to the `Deal` interface (after `officerndSyncId` at line 26):

```typescript
meetingDate: string | null;
meetingTime: string | null;
meetingDuration: number | null;
meetingLocation: string | null;
meetingNotes: string | null;
calendarEventId: string | null;
```

- [ ] **Step 3: Create calendar API client**

Create `frontend/src/api/calendar.ts`:

```typescript
import apiClient from "@/lib/api-client";

export const calendarApi = {
  getConnectUrl: () => apiClient.get<{ url: string }>("/calendar/connect").then((r) => r.data),
  getStatus: () => apiClient.get<{ connected: boolean }>("/calendar/status").then((r) => r.data),
};
```

Note: `.then((r) => r.data)` unwraps the Axios response so callers get the data directly.

- [ ] **Step 4: Add meeting API functions to deals client**

In `frontend/src/api/deals.ts`, the existing `markAsLost` takes a plain string: `markAsLost: async (id: string, reason: string)`. Add two new functions using the same `apiClient` import:

```typescript
scheduleMeeting: async (id: string, data: {
  meetingDate: string;
  meetingTime: string;
  meetingLocation: string;
  meetingNotes?: string;
}): Promise<Deal> => {
  const res = await apiClient.post<Deal>(`/deals/${id}/schedule-meeting`, data);
  return res.data;
},

cancelMeeting: async (id: string): Promise<Deal> => {
  const res = await apiClient.delete<Deal>(`/deals/${id}/schedule-meeting`);
  return res.data;
},
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/enums.ts frontend/src/types/deal.ts frontend/src/api/calendar.ts frontend/src/api/deals.ts
git commit -m "feat: update shared enums, frontend types and API clients for meetings"
```

---

## Task 6: Update PipelinePage — Won/Lost columns + WIN/LOSS buttons + filtering toggle

**Files:**
- Modify: `frontend/src/pages/deals/PipelinePage.tsx`

This is the largest frontend change. The pipeline board goes from 6 to 8 columns with toggle visibility for Won/Lost.

- [ ] **Step 1: Update PIPELINE_STAGES array (lines 23-30)**

Replace the local `PIPELINE_STAGES` array with 8 stages:

```typescript
const PIPELINE_STAGES = [
  { id: "new", label: "New", color: "#465FFF" },
  { id: "qualified", label: "Qualified", color: "#7C3AED" },
  { id: "meeting", label: "Meeting", color: "#A855F7" },
  { id: "proposal", label: "Proposal", color: "#EC4899" },
  { id: "negotiation", label: "Negotiation", color: "#F97316" },
  { id: "contract", label: "Contract", color: "#EAB308" },
  { id: "won", label: "Won", color: "#22C55E" },
  { id: "lost", label: "Lost", color: "#EF4444" },
];
```

- [ ] **Step 2: Update data fetching (lines 621-629)**

Replace the current `useQuery` that filters to `status: "active"` only. Change to fetch all statuses:

```typescript
const { data: deals = [], isLoading } = useQuery({
  queryKey: ["pipeline-deals"],
  queryFn: async () => {
    const [activeRes, wonRes, lostRes] = await Promise.all([
      dealsApi.findAll(1, 100, { status: "active" }),
      dealsApi.findAll(1, 100, { status: "won" }),
      dealsApi.findAll(1, 100, { status: "lost" }),
    ]);
    return [
      ...activeRes.data,
      ...wonRes.data,
      ...lostRes.data,
    ];
  },
});
```

Remove the old `.filter()` that excluded `isLost`, `WON`, and `LOST` stages.

- [ ] **Step 3: Add filtering toggle for Won/Lost columns**

Add state for toggling visibility:

```typescript
const [showTerminal, setShowTerminal] = useState(true);
```

Filter the stages array before rendering:

```typescript
const visibleStages = showTerminal
  ? PIPELINE_STAGES
  : PIPELINE_STAGES.filter((s) => s.id !== "won" && s.id !== "lost");
```

Add a toggle button in the toolbar area:

```tsx
<button
  onClick={() => setShowTerminal(!showTerminal)}
  className={`text-xs px-2 py-1 rounded border ${showTerminal ? "bg-gray-100" : ""}`}
  aria-label={showTerminal ? "Hide Won/Lost columns" : "Show Won/Lost columns"}
>
  {showTerminal ? "Hide" : "Show"} Won/Lost
</button>
```

Use `visibleStages` instead of `PIPELINE_STAGES` when mapping columns in the board render.

- [ ] **Step 4: Add WIN/LOSS buttons to DealCard for Contract stage**

Update `DealCard` props to accept `stageId`, `onWin`, `onLose`, and `onScheduleMeeting`:

```typescript
function DealCard({ deal, stageId, onWin, onLose, onScheduleMeeting, onClick }: {
  deal: Deal;
  stageId: string;
  onWin: (deal: Deal) => void;
  onLose: (deal: Deal) => void;
  onScheduleMeeting: (deal: Deal) => void;
  onClick: (deal: Deal) => void;
}) {
```

Inside the card, before the closing `</div>`, add conditional buttons:

For Contract stage — WIN/LOSS buttons:
```tsx
{stageId === "contract" && (
  <div className="flex gap-2 mt-2">
    <button
      onClick={(e) => { e.stopPropagation(); onWin(deal); }}
      className="flex-1 text-xs font-semibold py-1.5 rounded bg-green-500 text-white hover:bg-green-600 min-h-[44px]"
      aria-label="Mark as Won"
    >
      WIN
    </button>
    <button
      onClick={(e) => { e.stopPropagation(); onLose(deal); }}
      className="flex-1 text-xs font-semibold py-1.5 rounded bg-red-500 text-white hover:bg-red-600 min-h-[44px]"
      aria-label="Mark as Lost"
    >
      LOSS
    </button>
  </div>
)}
```

For Meeting stage — Schedule/Reschedule button:
```tsx
{stageId === "meeting" && (
  <button
    onClick={(e) => { e.stopPropagation(); onScheduleMeeting(deal); }}
    className="mt-2 w-full text-xs font-medium py-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 flex items-center justify-center gap-1 min-h-[44px]"
    aria-label={deal.meetingDate ? "Reschedule meeting" : "Schedule meeting"}
  >
    <CalendarIcon className="w-3.5 h-3.5" />
    {deal.meetingDate ? "Reschedule" : "Schedule Meeting"}
  </button>
)}
{stageId === "meeting" && deal.meetingDate && (
  <div className="mt-1 text-xs text-gray-500">
    {deal.meetingDate} at {deal.meetingTime} — {deal.meetingLocation}
  </div>
)}
```

Add `CalendarIcon` import from lucide-react.

Make won/lost cards non-draggable:
```tsx
draggable={stageId !== "won" && stageId !== "lost"}
```

- [ ] **Step 5: Specialized rendering for Won/Lost cards**

For Won column cards, show deal value prominently with green styling:
```tsx
{stageId === "won" && (
  <div className="mt-1 text-xs font-semibold text-green-700">
    QAR {deal.value?.toLocaleString()}
  </div>
)}
```

For Lost column cards, show loss reason with red styling:
```tsx
{stageId === "lost" && (
  <div className="mt-1">
    <div className="text-xs font-semibold text-red-700">
      QAR {deal.value?.toLocaleString()}
    </div>
    {deal.lossReason && (
      <div className="text-xs text-gray-500 mt-0.5 truncate" title={deal.lossReason}>
        {deal.lossReason}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Style Won/Lost columns differently**

In the `StageColumn` component, update header and card styling based on stage:

```tsx
const columnBg = stageId === "won" ? "bg-green-50" : stageId === "lost" ? "bg-red-50" : "bg-gray-50";
const headerBg = stageId === "won" ? "bg-green-100" : stageId === "lost" ? "bg-red-100" : "bg-white";
```

Make won/lost columns non-droppable (no `onDragOver`, no `onDrop`).

- [ ] **Step 7: Add loss reason modal state and handlers**

In the main `PipelinePage` component, add state:

```typescript
const [lossDeal, setLossDeal] = useState<Deal | null>(null);
const [lossReason, setLossReason] = useState("");
```

Add handlers. **Important:** `dealsApi.markAsLost` takes a plain string, NOT an object:

```typescript
const handleWin = (deal: Deal) => {
  dealsApi.update(deal.id, { stage: "WON", confirmTerminal: true })
    .then(() => queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] }));
};

const handleLose = (deal: Deal) => {
  setLossDeal(deal);
  setLossReason("");
};

const confirmLose = () => {
  if (!lossDeal) return;
  dealsApi.markAsLost(lossDeal.id, lossReason) // plain string, not { reason: ... }
    .then(() => {
      setLossDeal(null);
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
    });
};
```

Add the loss reason modal in the JSX (after the existing modals):

```tsx
{lossDeal && (
  <Modal isOpen={true} onClose={() => setLossDeal(null)} title="Mark as Lost">
    <div className="p-4 space-y-4">
      <p className="text-sm text-gray-600">
        Mark <strong>{lossDeal.title}</strong> as lost?
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={lossReason}
          onChange={(e) => setLossReason(e.target.value)}
          className="w-full border rounded-lg p-2 text-sm"
          rows={3}
          placeholder="Why was this deal lost?"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setLossDeal(null)}
          className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 min-h-[44px]"
        >
          Cancel
        </button>
        <button
          onClick={confirmLose}
          disabled={!lossReason.trim()}
          className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 min-h-[44px]"
        >
          Mark as Lost
        </button>
      </div>
    </div>
  </Modal>
)}
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/deals/PipelinePage.tsx
git commit -m "feat: add Won/Lost columns, WIN/LOSS buttons, and column toggle to pipeline"
```

---

## Task 7: Add Schedule Meeting modal to Meeting stage cards

**Files:**
- Modify: `frontend/src/pages/deals/PipelinePage.tsx`

- [ ] **Step 1: Add ScheduleMeetingModal component**

In `PipelinePage.tsx`, add a new component before the main `PipelinePage` export:

```tsx
function ScheduleMeetingModal({ deal, onClose, onSave }: {
  deal: Deal;
  onClose: () => void;
  onSave: () => void;
}) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(deal.meetingDate ?? "");
  const [time, setTime] = useState(deal.meetingTime ?? "08:30");
  const [location, setLocation] = useState(deal.meetingLocation ?? "");
  const [notes, setNotes] = useState(deal.meetingNotes ?? "");

  // 18 slots: 08:30 to 17:00 (last slot ends at 17:30)
  const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const totalMin = i * 30 + 510; // 510 = 8*60+30
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const isSundayToThursday = (dateStr: string) => {
    if (!dateStr) return true;
    const d = new Date(dateStr);
    const day = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
    return day !== 5 && day !== 6;
  };

  const mutation = useMutation({
    mutationFn: (data: any) => dealsApi.scheduleMeeting(deal.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-deals"] });
      onSave();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ meetingDate: date, meetingTime: time, meetingLocation: location, meetingNotes: notes });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={deal.meetingDate ? "Reschedule Meeting" : "Schedule Meeting"}>
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div className="text-sm text-gray-500 mb-2">
          {deal.client?.name} — {deal.title}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className={`w-full border rounded-lg p-2 text-sm ${!isSundayToThursday(date) && date ? "border-red-500" : ""}`}
          />
          {!isSundayToThursday(date) && date && (
            <p className="text-xs text-red-500 mt-1">Working days are Sunday to Thursday</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time <span className="text-red-500">*</span>
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full border rounded-lg p-2 text-sm"
          >
            {TIME_SLOTS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">30-minute meeting, working hours 08:30–17:30</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            maxLength={500}
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="Meeting location"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
            placeholder="Meeting agenda or notes"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 min-h-[44px]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !date || !time || !location || !isSundayToThursday(date)}
            className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 min-h-[44px]"
          >
            {mutation.isPending ? "Saving..." : deal.meetingDate ? "Reschedule" : "Schedule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 2: Add meeting state and wire up ScheduleMeetingModal**

In the `PipelinePage` component, add state:

```typescript
const [meetingDeal, setMeetingDeal] = useState<Deal | null>(null);
```

Wire `onScheduleMeeting` prop through `StageColumn` to `DealCard`, setting `setMeetingDeal`.

Add the modal in JSX after the loss reason modal:

```tsx
{meetingDeal && (
  <ScheduleMeetingModal
    deal={meetingDeal}
    onClose={() => setMeetingDeal(null)}
    onSave={() => setMeetingDeal(null)}
  />
)}
```

- [ ] **Step 3: Verify the page loads**

Run: `pnpm --filter frontend dev`
Open: `http://localhost:5173/pipeline`
Expected: 8 columns visible. Contract cards have WIN/LOSS buttons. Meeting cards have Schedule Meeting button. Won/Lost toggle works.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/deals/PipelinePage.tsx
git commit -m "feat: add schedule meeting modal to pipeline Meeting stage"
```

---

## Task 8: Add Google Calendar status indicator to pipeline

**Files:**
- Modify: `frontend/src/pages/deals/PipelinePage.tsx`

- [ ] **Step 1: Show calendar connection status on page**

Import `calendarApi` from `@/api/calendar` and `AlertCircle` from `lucide-react`.

Add query in the PipelinePage component:

```tsx
const { data: calendarStatus } = useQuery({
  queryKey: ["calendar-status"],
  queryFn: () => calendarApi.getStatus(),
});
```

In the stats/header area, show a warning if not connected:

```tsx
{calendarStatus && !calendarStatus.connected && (
  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
    <AlertCircle className="w-3.5 h-3.5" />
    Google Calendar not connected
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/deals/PipelinePage.tsx
git commit -m "feat: show Google Calendar connection status on pipeline"
```

---

## Task 9: Add environment variables and verify end-to-end

**Files:**
- Modify: `backend/.env` (add Google OAuth vars)

- [ ] **Step 1: Add environment variables**

Add to `backend/.env`:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://arafatcrm.cloud/api/v1/calendar/oauth/callback
```

Note: Replace `your-client-id` and `your-client-secret` with actual values from the Google Cloud Console once the OAuth app is configured.

- [ ] **Step 2: Verify everything works end-to-end**

Run: `pnpm dev`
Test:
1. Pipeline loads with 8 columns
2. Won/Lost toggle hides/shows the last two columns
3. Drag a deal to Contract — WIN/LOSS buttons appear
4. Click WIN — deal moves to Won column with green styling
5. Click LOSS — loss reason modal appears — submit — deal moves to Lost column with red styling
6. Drag a deal to Meeting — Schedule Meeting button appears
7. Schedule a meeting — saves to deal (Google Calendar will gracefully degrade until OAuth is configured)
8. Meeting card shows date/time/location
9. Calendar status warning shows if Google not connected

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete pipeline Won/Lost columns and meeting scheduling"
```
