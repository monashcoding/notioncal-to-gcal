# notioncal-to-gcal

Automatically syncs events from a Notion database to a Google Calendar. You fill in events on Notion; this script keeps Google Calendar up to date automatically, running every 30 minutes. Notion is the sole source of truth — all events flow one-way from Notion into Google Calendar only.

---

## Prerequisites

- **Node.js** v18 or later (`node --version` to check)
- A **Notion internal integration** with read access to your database:
  1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) → New integration
  2. Copy the "Internal Integration Token"
  3. Open your Notion database → `...` menu → **Connections** → add your integration
- A **Google Cloud project** with OAuth credentials:
  1. Go to [console.cloud.google.com](https://console.cloud.google.com/) → New project
  2. Enable the **Google Calendar API** (APIs & Services → Library)
  3. Create **OAuth 2.0 credentials** (APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application)
  4. Add `http://localhost:3000/auth/callback` as an Authorised redirect URI
  5. Copy the Client ID and Client Secret
  6. Find your target **Calendar ID** in Google Calendar → Settings → your calendar → "Calendar ID"

---

## Setup (local)

```bash
# 1. Clone and install
git clone <repo-url>
cd notioncal-to-gcal
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and fill in all six values

# 3. Authorise Google Calendar (one-time only)
node scripts/setup-auth.js
# Open the printed URL in your browser and grant permission
# tokens.json will be saved automatically — stop the server with Ctrl+C

# 4. Start syncing
node index.js
```

---

## Deployment

The app is containerised and runs on **Dokploy** (Docker) on our Oracle server.
Pushing to `main` auto-deploys via Dokploy's GitHub integration.

See **[DEPLOY.md](DEPLOY.md)** for the full setup: environment variables, the
`/app/data` persistent volume, and the one-time token-seeding step.

Key points for the deployed container:
- `tokens.json` and `sync-state.json` live in a persistent volume at `/app/data`
  (set via the `DATA_DIR` env var, which the `Dockerfile` defaults to `/app/data`).
  Locally, `DATA_DIR` is unset so both files stay in the project root as usual.
- Losing that volume would drop the OAuth tokens (sync stops) and the state map
  (next run re-creates every event as a duplicate) — so it must persist.

---

## How it works

Each sync run:
1. Fetches every page from your Notion database (filtered — see `sync/fetchNotion.js`)
2. **Creates** a Google Calendar event for any page that has never been synced
3. **Updates** the Google event for any page that was already synced. If that
   event was deleted in Google (status `cancelled` or 404/410), it is
   **recreated** instead of silently patching a dead event.
4. **Deletes** Google events whose Notion pages were removed or archived
5. Skips pages with no date set (logs a warning)

Events with an `Event Start Time` become timed events (Australia/Melbourne);
otherwise they are all-day events. Description is built from the `Caption` and
`Registration Link` fields; `Venue` maps to the event location.

The mapping between Notion page IDs and Google event IDs is stored in
`sync-state.json` (never committed to git).

---

## Fan-out sinks (Discord events + social posting)

Beyond Google Calendar, a Notion event can fan out to more destinations. All of
these are **optional and off by default** — if a sink's env vars are missing it is
inert (silently skipped, never crashes). Every fan-out sink only fires for pages
whose **`Announce` checkbox** (a new property on the events database) is ticked.

Two kinds of sink:

- **Mirror sinks** — kept exactly in sync with Notion every run (create / update /
  delete). Google Calendar, and **Discord scheduled events**.
- **Announce-once sinks** — post once, and only after a human approves. These are
  the socials: **LinkedIn** (company page), **Facebook** (page), **Instagram** (feed).

### The Discord ✅ approval loop (how socials get published)

Social posts publish live, so a human gates them — implemented by polling, no bot
gateway needed:

1. Tick `Announce` on an event → on the next run the bot posts a **preview** of the
   post to a private Discord channel (`DISCORD_CONFIRM_CHANNEL_ID`) and adds a ✅.
   One preview **per platform**, so you can approve Facebook while holding Instagram.
2. A human clicks ✅.
3. A later run reads the reaction and **publishes** to that platform (up to ~30 min
   later). Once posted it is never touched again.

### Current status

**Discord scheduled events work today** once the bot env vars are set. LinkedIn,
Facebook, and Instagram are fully built but **inert until API access is granted**:

| Sink | Blocker before it can post |
|---|---|
| Discord events | none — bot needs **Create Events + Manage Events** + confirm-channel access |
| LinkedIn (page) | Community Management API approval + page-admin token |
| Facebook (page) | Meta App Review + Business Verification |
| Instagram (feed) | Meta App Review + Business Verification + a **public image URL**; no text-only posts |

When access lands, just add the env vars (see `.env.example`) — no code change.

### Adding another platform

Each social platform is one file in `sync/platforms/` exporting
`{ key, label, isConfigured, buildPreview, publish }`, registered in the
`SOCIAL_PLATFORMS` list in `sync/syncRunner.js`. The `announceOnce` framework
(`sync/announce.js`) handles the ✅ approval flow for all of them.

---

## Adding new Notion fields

All field translation logic lives in **`sync/mapFields.js`** — read a value off
`page.properties[...]` and assign it onto the `googleEvent` object. Existing
examples in that file cover title, timeline dates, start/end times, venue
(location), and the caption + registration link (description). Add a new field
by following the same pattern; no other files need changing.

---

## File structure

```
index.js                  Entry point: load tokens, start cron scheduler
scripts/setup-auth.js     One-time Google OAuth browser flow
auth/google.js            OAuth2 client, token helpers
auth/notion.js            Notion client
routes/auth.js            Express routes for OAuth callback
auth/discord.js           Discord REST helper (bot-token fetch wrapper)
sync/fetchNotion.js       Paginated, filtered fetch from Notion database
sync/mapFields.js         Notion page → Google Calendar event (edit to add fields)
sync/googleCalendar.js    Google Calendar create / update / delete wrappers
sync/mapDiscord.js        Notion page → Discord scheduled-event payload
sync/discordEvents.js     Discord scheduled-event create / update / delete wrappers
sync/announce.js          Announce-once framework + Discord ✅ approval loop
sync/platforms/*.js       One file per social platform (linkedin/facebook/instagram)
sync/stateManager.js      Load and save sync-state.json (nested; honours DATA_DIR)
sync/syncRunner.js        Core sync orchestration
Dockerfile                Container image (node:22-alpine)
.dockerignore             Excludes secrets, state, node_modules from the image
DEPLOY.md                 Dokploy deployment guide
```
