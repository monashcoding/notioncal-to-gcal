const { google } = require('googleapis');
const { oauth2Client } = require('../auth/google');

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

async function createEvent(eventData) {
  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: eventData,
  });
  return response.data.id;
}

// Render a start/end block as one comparable string.
// Google echoes all-day events back as { date } and timed ones as
// { dateTime: '2026-09-10T10:00:00+10:00', timeZone }, while mapFields builds
// a naive local dateTime plus an explicit timeZone. Trimming the offset off
// Google's value lines the two up, which is safe because every timed event we
// write is stamped Australia/Melbourne.
function describeTime(block) {
  if (!block) return 'unset';
  if (block.dateTime) return `${String(block.dateTime).slice(0, 19)} (${block.timeZone || '?'})`;
  if (block.date) return `${block.date} (all-day)`;
  return 'unset';
}

// Compare the event we want against the event Google currently holds, and
// return a human-readable list of what actually differs.
//
// Only keys present in `eventData` are compared, which mirrors what patch would
// do: a field we never send is a field we do not manage, so it cannot be stale.
function diffEvent(existing, eventData) {
  const changes = [];

  for (const key of ['summary', 'location', 'description']) {
    if (!(key in eventData)) continue;
    const want = eventData[key] ?? null;
    const have = existing[key] ?? null;
    if (want !== have) changes.push(`${key}: ${JSON.stringify(have)} -> ${JSON.stringify(want)}`);
  }

  for (const key of ['start', 'end']) {
    if (!(key in eventData)) continue;
    const want = describeTime(eventData[key]);
    const have = describeTime(existing[key]);
    if (want !== have) changes.push(`${key}: ${have} -> ${want}`);
  }

  return changes;
}

// Reconcile an existing event with what Notion currently says.
//
// If the target event has been deleted in Google Calendar it comes back as
// status 'cancelled' (patching it is a no-op that stays invisible) or 404/410
// (hard-deleted). In those cases we recreate the event instead so a manual
// deletion in Google doesn't permanently break sync.
//
// Returns { id, status, changes }:
//   status 'recreated' — the event was gone in Google and has a new id
//   status 'updated'   — Google's copy differed and was patched; `changes` says how
//   status 'unchanged' — Google already matched Notion; no write was made
//
// Skipping the patch when nothing differs is what makes the log meaningful: an
// unconditional patch logs "Updated" on every run for every event, which tells
// you the sync is alive but never tells you when a value actually moved.
async function updateEvent(googleEventId, eventData) {
  let existing;
  try {
    const response = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
    });
    if (response.data.status === 'cancelled') {
      return { id: await createEvent(eventData), status: 'recreated', changes: [] };
    }
    existing = response.data;
  } catch (err) {
    if (err.code === 404 || err.code === 410) {
      return { id: await createEvent(eventData), status: 'recreated', changes: [] };
    }
    throw err; // transient/auth errors should surface, not silently recreate
  }

  const changes = diffEvent(existing, eventData);
  if (changes.length === 0) {
    return { id: googleEventId, status: 'unchanged', changes };
  }

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
    requestBody: eventData,
  });
  return { id: googleEventId, status: 'updated', changes };
}

async function deleteEvent(googleEventId) {
  await calendar.events.delete({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
  });
}

module.exports = { createEvent, updateEvent, deleteEvent, diffEvent };
