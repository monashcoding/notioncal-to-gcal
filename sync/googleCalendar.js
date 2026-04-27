const { google } = require('googleapis');
const { oauth2Client } = require('../auth/google');

// Create an authenticated Google Calendar API client
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// All events are written to the calendar specified by GOOGLE_CALENDAR_ID,
// not the user's default "primary" calendar
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// Create a new event and return its Google event ID
async function createEvent(eventData) {
  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: eventData,
  });
  return response.data.id;
}

// Update an existing event in place (patch only sends changed fields)
async function updateEvent(googleEventId, eventData) {
  await calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
    requestBody: eventData,
  });
}

// Permanently delete an event from Google Calendar
async function deleteEvent(googleEventId) {
  await calendar.events.delete({
    calendarId: CALENDAR_ID,
    eventId: googleEventId,
  });
}

module.exports = { createEvent, updateEvent, deleteEvent };
