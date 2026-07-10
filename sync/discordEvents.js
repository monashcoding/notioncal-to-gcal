// Create / update / delete wrappers for Discord guild scheduled events.
// Mirrors the shape of sync/googleCalendar.js so syncRunner can treat Discord
// as another "mirror" sink (kept in sync with Notion every run).

const { discordRequest } = require('../auth/discord');

function guildEventsPath() {
  return `/guilds/${process.env.DISCORD_GUILD_ID}/scheduled-events`;
}

async function createScheduledEvent(payload) {
  const event = await discordRequest('POST', guildEventsPath(), payload);
  return event.id;
}

// Patch an existing scheduled event. If it was deleted in Discord (404) we
// recreate it, so a manual deletion doesn't permanently break sync — matching
// the recreate behaviour in googleCalendar.js. Returns the live event id.
async function updateScheduledEvent(eventId, payload) {
  try {
    await discordRequest('PATCH', `${guildEventsPath()}/${eventId}`, payload);
    return eventId;
  } catch (err) {
    if (err.status === 404) {
      return await createScheduledEvent(payload);
    }
    throw err;
  }
}

async function deleteScheduledEvent(eventId) {
  try {
    await discordRequest('DELETE', `${guildEventsPath()}/${eventId}`);
  } catch (err) {
    // Already gone in Discord — treat as success so state can be cleaned up.
    if (err.status !== 404) throw err;
  }
}

module.exports = { createScheduledEvent, updateScheduledEvent, deleteScheduledEvent };
