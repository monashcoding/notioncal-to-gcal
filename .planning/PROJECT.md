# Project: notioncal-to-gcal

## Vision
One-way sync from a Notion database to Google Calendar via a scheduled Node.js script. Notion is the source of truth. Designed as a teaching project for Node.js learners.

## Requirements

### Validated
- Sync Name + Timeline (all-day events) from Notion → Google Calendar
- Create / update / delete event lifecycle
- 30-minute cron schedule via node-cron
- One-time OAuth browser flow, tokens persisted in tokens.json
- sync-state.json flat file maps Notion page IDs to Google event IDs
- Per-event error isolation (one failure doesn't crash the run)
- Timestamp-prefixed console logging with final summary

### Out of Scope
- Webhooks, two-way sync, web UI
- Location / Registration link / Caption fields (TODO stubs only)

## Constraints
- CJS (require), not ESM — for teaching clarity
- No database — flat JSON files only
- tokens.json and sync-state.json must not be committed

## Key Decisions
| Decision | Status | Rationale |
|----------|--------|-----------|
| CJS over ESM | Approved | Simpler for learners |
| Flat JSON state | Approved | No database overhead for small club calendar |
| Express for auth only | Approved | Minimal dep; runs once then never again |
