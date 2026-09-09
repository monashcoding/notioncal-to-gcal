# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project does

One-way sync from a Notion database to a Google Calendar, running on a 30-minute cron schedule via `node-cron`. Notion is the sole source of truth. All events are all-day events only.

## Running the project

```bash
npm install

# One-time Google OAuth setup (opens browser, saves tokens.json)
node scripts/setup-auth.js

# Start the sync (runs immediately, then every 30 minutes)
node index.js
```

There are no tests, no build step, and no linter configured.

## File structure and responsibilities

```
index.js                  # Entry point: load tokens, validate env, start cron
scripts/setup-auth.js     # One-time OAuth flow via local Express server
auth/google.js            # OAuth2 client, getAuthUrl, token helpers
auth/notion.js            # Notion client initialisation
routes/auth.js            # Express routes: /auth/google and /auth/callback
sync/fetchNotion.js       # Fetch all pages from the Notion database
sync/mapFields.js         # Transform a Notion page → Google Calendar event object
sync/googleCalendar.js    # create / update / delete event wrappers
sync/stateManager.js      # load / save sync-state.json
sync/syncRunner.js        # Core orchestration: fetch → diff → create/update/delete
```

## Key architecture decisions

### Field mapping is isolated
All Notion → Google Calendar field translation lives in `sync/mapFields.js`. Adding a new field (e.g. Location, registration link, caption) only requires editing that one file — never touching `syncRunner.js`.

### How an event's start/end time is resolved
`resolveEventTimes()` in `sync/mapFields.js` is the single source of truth, shared by both the Google and Discord sinks. It prefers, in order:

1. **A time on the Timeline date itself** — structured, carries its own timezone, expresses multi-day ranges natively. Preferred for all new events.
2. **The `Event Start Time` / `Event End Time` text fields** — free text, so AM/PM has to be inferred. Legacy fallback.

`buildDateTime()` defaults bare numbers to **PM** (`"6"` → 6pm), which is right for this calendar's mostly-evening events but wrong for mornings. That reading is overridden only when it is provably impossible — i.e. it would put the end at or before the start. If the times can't be made valid, both are dropped and the event syncs as all-day, so a malformed time field can never block the *date* from updating.

### Which pages sync
`isSyncEnabled()` in `sync/fetchNotion.js` checks the `🔹 Sync to Public Calendar` rollup, which lives on the **related marketing ticket**, not the calendar page. A page can look complete in Notion and still be invisible to sync. Eligibility is evaluated in code rather than as a Notion query filter so the runner can tell "not marked for sync" apart from "deleted in Notion" and log which applies.

### Sync state
`sync-state.json` (project root, gitignored) is a flat `{ notionPageId: googleEventId }` map. It is loaded at the start of each run and written back after every mutation. No database required.

### Deletion detection
After fetching, the *eligible* page IDs are collected into a Set. Any key in `sync-state.json` absent from that Set has its mirrors removed and the key dropped from state. The log names which of the two causes applies — the page was removed from Notion, or it is no longer marked `🔹 Sync to Public Calendar`.

### Authentication
- **Notion:** `NOTION_TOKEN` env var → `@notionhq/client`.
- **Google:** OAuth 2.0 with `access_type: 'offline'`. Tokens stored in `tokens.json` (gitignored). `index.js` exits with a clear message if `tokens.json` is missing.

## Environment variables

All vars live in `.env` (see `.env.example`):

| Variable | Purpose |
|---|---|
| `NOTION_TOKEN` | Internal integration token from notion.so/my-integrations |
| `NOTION_DATABASE_ID` | `29c7ff3886cd4fea92400f24d5618388` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/auth/callback` |
| `GOOGLE_CALENDAR_ID` | Target calendar ID (not "primary") |

## Logging convention

Every log line is prefixed with a timestamp: `[YYYY-MM-DD HH:MM:SS]`. The sync run summary format is:

```
Sync complete. Created: N, Updated: N, Deleted: N, Skipped: N
```

## Gotchas

- `require('dotenv').config()` must be the **first line** in `index.js` so env vars are available before any module loads.
- Google Calendar all-day events use `date` format (`YYYY-MM-DD`), not `dateTime`. Using `dateTime` will break all-day display.
- Notion pages with a null/missing `Timeline` property are **skipped** (not errored). A warning is logged.
- A single event failure must not crash the run — each create/update/delete is wrapped in its own try/catch. Note this also means a persistently rejected event fails *silently* every run; `updateEvent` only patches when something actually differs, so a change in the log is a real change.
- Google rejects an event whose end is at or before its start with `400 The specified time range is empty`.
- Notion API rate limit is 3 req/s. Not a concern for a small calendar, but batch carefully if the database grows.
