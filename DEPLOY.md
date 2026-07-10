# Deploying to Dokploy

This app is a single long-running Node process: it runs a sync immediately on
boot, then every 30 minutes via `node-cron`. It has no web server to expose and
no inbound traffic — it only needs its two persistent files to survive redeploys.

## 1. Create the service

In Dokploy, create a new **Application** from this Git repo:

- **Branch:** `main`
- **Build type:** Dockerfile (the repo's `Dockerfile` is used automatically)
- No domain / port mapping is needed — this is a background worker, not a web app.

## 2. Environment variables

Set these in the Dokploy **Environment** tab (same values as your local `.env`):

| Variable | Value |
|---|---|
| `NOTION_TOKEN` | Notion internal integration token |
| `NOTION_DATABASE_ID` | `29c7ff3886cd4fea92400f24d5618388` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/auth/callback` (only used by the one-time auth script, not at runtime) |
| `GOOGLE_CALENDAR_ID` | Target calendar ID |

`DATA_DIR=/app/data` is already set in the Dockerfile — you do **not** need to add it.

## 3. Persistent volume (critical)

The app stores two files it must not lose between deploys:

- `tokens.json` — Google OAuth tokens (has an offline refresh token, so no re-login)
- `sync-state.json` — the `{ notionPageId: googleEventId }` map that prevents duplicate events

Add a **Volume Mount** in Dokploy:

- **Mount path (in container):** `/app/data`
- Type: a named/persistent volume (Dokploy manages the host path).

> ⚠️ Without this volume, every redeploy wipes the OAuth tokens (sync stops) and
> the state map (the next sync re-creates every event as a duplicate). This is
> the single most important step.

## 4. Seed `tokens.json` into the volume

The OAuth flow needs a browser once, which is awkward inside a container, so
generate the tokens locally and drop them into the volume:

1. Locally, run the one-time auth flow (opens a browser):
   ```bash
   npm install
   node scripts/setup-auth.js
   ```
   This writes `tokens.json` in the project root.

2. Copy that `tokens.json` into the mounted volume on the server. Either:
   - Use Dokploy's file manager / a shell into the container to place it at
     `/app/data/tokens.json`, **or**
   - `scp` it to the volume's host path and it will appear at `/app/data/tokens.json`.

Because the token was requested with `access_type: 'offline'`, the refresh token
keeps it valid indefinitely — you only do this once.

## 5. Deploy

Trigger a deploy. Check the logs — a healthy first run looks like:

```
[YYYY-MM-DD HH:MM:SS] Sync started
[YYYY-MM-DD HH:MM:SS] Fetched N pages from Notion
[YYYY-MM-DD HH:MM:SS] Sync complete. Created: N, Updated: N, Deleted: N, Skipped: N
```

If you see `tokens.json not found. Please run: node scripts/setup-auth.js`, the
volume mount or the seed step (3–4) is missing.

## Updating

Push to `main` → redeploy in Dokploy. The `/app/data` volume (tokens + state)
persists across deploys, so no re-auth and no duplicates.
