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

// Patch an existing event. If the target event has been deleted in Google
// Calendar it comes back as status 'cancelled' (patching it is a no-op that
// stays invisible) or 404/410 (hard-deleted). In those cases we recreate the
// event instead so a manual deletion in Google doesn't permanently break sync.
// Returns the event id that is now live — same id, or a new one if recreated.
async function updateEvent(googleEventId, eventData) {
  try {
    const existing = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId: googleEventId,
    });
    if (existing.data.status === 'cancelled') {
      return await createEvent(eventData);
    }
  } catch (err) {
    if (err.code === 404 || err.code === 410) {
      return await createEvent(eventData);
    }
    throw err; // transient/auth errors should surface, not silently recreate
  }

  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
    requestBody: eventData,
  });
  return googleEventId;
}

async function deleteEvent(googleEventId) {
  await calendar.events.delete({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
  });

}

module.exports = { createEvent, updateEvent, deleteEvent };
