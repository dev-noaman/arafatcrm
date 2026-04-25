Everything looks right. All four sections hang together cleanly — schema, API, frontend, and error handling are internally consistent and aligned with your existing codebase patterns. You can hand this to Claude Code as-is.
Two very small things before you write the doc, both minor:
On the OAuth scope verification
You said "verify at implementation time and add back flex.community.members.read only if needed." That's fine, but make sure that verification actually happens — in practice "verify later" often becomes "add it back defensively because the API returned an incomplete payload once." Concretely: during implementation, log the first real membership response payload (redact PII) and check whether contact_email and contact_phone are present without the members scope. If they are, great, leave it out. If not, add the scope and move on. Don't leave it as a decision for Claude Code to make silently.
One thing worth flagging in the design doc itself
The re-sync overwrite policy from Section 1 (PENDING rows overwrite freely, non-PENDING rows set upstreamChangedAt + upstreamChanges diff) needs to be restated in Section 4 where the sync service is described, because that's where a reader will look for it. Right now it's only in the schema section. Duplication is fine for a design doc — having it in both places means neither a schema-first nor a sync-logic-first reader misses it.
That's it. The design is ready. A few things Claude Code will likely need reminding of when it actually writes the code, which might be worth a short "implementation notes" section at the end of the design doc:

Explicit @Column({ name: "snake_case" }) on every column (your gotcha #2)
@Roles(Role.ADMIN) on every endpoint, including GETs
Enum values in packages/shared, not inline in backend or frontend
Modal component (not raw div.fixed.inset-0) for any confirm dialogs
class-validator DTOs with forbidNonWhitelisted: true for all request bodies including action endpoints
PM2 env caching (your gotcha #20) — deploying this will require pm2 delete && pm2 start to pick up the new OFFICERND_* env vars, not just pm2 restart

Ship the design doc. This is a solid plan.