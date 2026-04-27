/**
 * TASK 3: Implement three Google Calendar API wrappers — create, update, and delete.
 *
 * In your To-Do API, you handled CRUD operations yourself (adding to an array,
 * finding by ID, splicing out items). Here, you're telling Google's servers to
 * do the same thing — but instead of mutating an array, you're calling their API.
 *
 * The pattern is the same: create, update, delete. The difference is you're
 * sending HTTP requests to Google instead of changing local data.
 *
 * -----------------------------------------------------------------------------
 * ASYNC/AWAIT
 * -----------------------------------------------------------------------------
 * Every function here is async because API calls take time — the request has to
 * travel to Google's servers and back. You use `await` to pause and wait for
 * the response before continuing.
 *
 * You may have seen the older callback style in Lesson 1:
 *   fs.readFile('file.txt', function(err, data) { ... })
 *
 * async/await is the modern way to write the same thing — cleaner and easier to read:
 *   const data = await fs.promises.readFile('file.txt');
 *
 * All three functions you write should use await when calling the Google API.
 *
 * Docs: https://javascript.info/async-await
 *
 * -----------------------------------------------------------------------------
 * HOW THE GOOGLE CALENDAR CLIENT WORKS
 * -----------------------------------------------------------------------------
 * `calendar` below is a pre-built API client — think of it like a helper object
 * with methods for every Google Calendar operation.
 *
 * You call it like this:
 *   const response = await calendar.events.insert({ ... });
 *
 * The three methods you need are:
 *   calendar.events.insert  — creates a new event
 *   calendar.events.patch   — updates an existing event (only changed fields)
 *   calendar.events.delete  — permanently deletes an event
 *
 * Each one takes an object with some required fields:
 *   - calendarId   → which calendar to write to (use the CALENDAR_ID constant below)
 *   - eventId      → the Google event ID (needed for patch and delete, not insert)
 *   - requestBody  → the event data (needed for insert and patch, not delete)
 *
 * Docs: https://developers.google.com/calendar/api/v3/reference/events
 *
 * -----------------------------------------------------------------------------
 * DEBUGGING TIP
 * -----------------------------------------------------------------------------
 * If something isn't working, add console.log before and after your API call:
 *
 *   console.log('Creating event:', eventData);
 *   const response = await calendar.events.insert({ ... });
 *   console.log('Response:', response.data);
 *
 * This is exactly what you did with req.body in your To-Do API — same idea.
 */

const { google } = require('googleapis');
const { oauth2Client } = require('../auth/google');

// Authenticated Google Calendar API client — ready to use, don't change this
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// The target calendar — loaded from your .env file
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// TODO 1: Create a new calendar event.
//
// Call calendar.events.insert with:
//   - calendarId: CALENDAR_ID
//   - requestBody: eventData  (this is the object from mapFields.js)
//
// Then return the new event's Google ID from: response.data.id
// (syncRunner.js stores this ID so it can update/delete the event later)
//
// Docs: https://developers.google.com/calendar/api/v3/reference/events/insert
async function createEvent(eventData) {
  // const response = await calendar.events.???
  // return ???
}

// TODO 2: Update an existing calendar event.
//
// Call calendar.events.patch with:
//   - calendarId: CALENDAR_ID
//   - eventId: googleEventId  (the ID returned by createEvent earlier)
//   - requestBody: eventData
//
// You don't need to return anything — just await the call.
//
// Docs: https://developers.google.com/calendar/api/v3/reference/events/patch
async function updateEvent(googleEventId, eventData) {
  // await calendar.events.???
}

// TODO 3: Delete a calendar event permanently.
//
// Call calendar.events.delete with:
//   - calendarId: CALENDAR_ID
//   - eventId: googleEventId
//
// You don't need to return anything — just await the call.
//
// Docs: https://developers.google.com/calendar/api/v3/reference/events/delete
async function deleteEvent(googleEventId) {
  // await calendar.events.???
}

module.exports = { createEvent, updateEvent, deleteEvent };
