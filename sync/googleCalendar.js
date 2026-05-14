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

async function updateEvent(googleEventId, eventData) {
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
    requestBody: eventData,
  });
}

async function deleteEvent(googleEventId) {
  await calendar.events.delete({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
  });

}

module.exports = { createEvent, updateEvent, deleteEvent };
