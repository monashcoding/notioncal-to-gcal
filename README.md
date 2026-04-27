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

## Setup

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

## How it works

Each sync run:
1. Fetches every page from your Notion database
2. **Creates** a Google Calendar event for any page that has never been synced
3. **Updates** the Google event for any page that was already synced
4. **Deletes** Google events whose Notion pages were removed or archived
5. Skips pages with no date set (logs a warning)

The mapping between Notion page IDs and Google event IDs is stored in `sync-state.json` (never committed to git).

---

## Adding new Notion fields

All field translation logic lives in **`sync/mapFields.js`**. To add a new field:

1. Open `sync/mapFields.js`
2. Find the relevant `// TODO: add [field] here` comment
3. Uncomment and adapt the example code
4. That's it — no other files need changing

---

## File structure

```
index.js                  Entry point: load tokens, start cron scheduler
scripts/setup-auth.js     One-time Google OAuth browser flow
auth/google.js            OAuth2 client, token helpers
auth/notion.js            Notion client
routes/auth.js            Express routes for OAuth callback
sync/fetchNotion.js       Paginated fetch from Notion database
sync/mapFields.js         Notion page → Google Calendar event (edit to add fields)
sync/googleCalendar.js    Google Calendar create / update / delete wrappers
sync/stateManager.js      Load and save sync-state.json
sync/syncRunner.js        Core sync orchestration
```
