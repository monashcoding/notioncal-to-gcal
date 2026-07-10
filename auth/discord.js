// Thin wrapper around the Discord REST API (v10).
//
// We don't need the full discord.js library — this project only makes a handful
// of plain HTTP calls (create/edit/delete scheduled events, post a message, read
// reactions). Node 18+ ships a global `fetch`, so no dependency is required.
//
// Auth is a bot token sent as `Authorization: Bot <token>`. The bot must be a
// member of the target guild with the relevant permissions (Create Events AND
// Manage Events for scheduled events — Discord splits create vs edit/delete; and
// View Channel / Send Messages / Read Message History / Add Reactions for the
// confirm channel).

const API_BASE = 'https://discord.com/api/v10';

// Discord is configured only if we have both a bot token and a target guild.
// The rest of the app checks this before attempting any Discord call, so a
// missing token simply disables Discord rather than crashing the run.
function isConfigured() {
  return Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

// Low-level request helper. Returns the parsed JSON body (or null for empty
// 204 responses like DELETE). Throws an Error with the Discord error payload
// on any non-2xx status so callers can log it and continue.
async function discordRequest(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || res.statusText;
    const err = new Error(`Discord ${method} ${path} → ${res.status}: ${message}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

module.exports = { isConfigured, discordRequest, API_BASE };
