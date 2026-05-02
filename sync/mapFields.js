/**
 * TASK 2: Transform a Notion page object into a Google Calendar event object.
 *
 * This is the same idea as transforming data in your To-Do API — you receive
 * data in one shape and need to return it in a different shape.
 *
 * Here the input is a raw Notion page, and the output is an object that
 * Google Calendar understands.
 *
 * -----------------------------------------------------------------------------
 * FIRST: SEE WHAT THE REAL DATA LOOKS LIKE
 * -----------------------------------------------------------------------------
 * Before writing any code, add this line at the top of the function body:
 *
 *   console.log(JSON.stringify(page.properties, null, 2));
 *
 * Then run `node index.js`. You'll see the actual Notion data printed in your
 * terminal. Reading raw API responses is one of the most important backend
 * skills — don't skip this step.
 *
 * You'll see something like:
 *
 *   {
 *     "Name": {
 *       "title": [{ "plain_text": "Trivia Night", ... }]
 *     },
 *     "Timeline": {
 *       "date": { "start": "2026-05-01", "end": null }
 *     }
 *   }
 *
 * Docs (use this to understand other property types):
 * https://developers.notion.com/reference/property-value-object
 *
 * -----------------------------------------------------------------------------
 * ASYNC/AWAIT — A QUICK NOTE
 * -----------------------------------------------------------------------------
 * This function is NOT async — it's a plain data transform with no API calls.
 * You'll see async functions in the other two task files.
 *
 * -----------------------------------------------------------------------------
 * OPTIONAL CHAINING (?.)
 * -----------------------------------------------------------------------------
 * Notion properties can sometimes be null or missing. Optional chaining lets
 * you safely access nested values without crashing:
 *
 *   props.Timeline?.date?.start
 *   // returns undefined if Timeline or date is null, instead of throwing an error
 *
 * Docs: https://javascript.info/optional-chaining
 *
 * -----------------------------------------------------------------------------
 * WHAT GOOGLE CALENDAR EXPECTS
 * -----------------------------------------------------------------------------
 * A Google Calendar all-day event object looks like this:
 *
 *   {
 *     summary: "Trivia Night",
 *     start: { date: "2026-05-01" },
 *     end:   { date: "2026-05-01" }
 *   }
 *
 * IMPORTANT: Use `date` (a YYYY-MM-DD string), NOT `dateTime`.
 * Using `dateTime` breaks all-day event display in Google Calendar.
 *
 * Docs: https://developers.google.com/calendar/api/v3/reference/events#resource
 */

// Returns the day after dateStr (YYYY-MM-DD) as a YYYY-MM-DD string.
// Google Calendar all-day events use an exclusive end date: an event "on" May 3
// must have end.date = "2026-05-04". This function does that shift.
// UTC arithmetic avoids DST edge cases.
function addOneDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().split('T')[0];
}

// Parses a time string from Notion (e.g. "5:30 PM" or "17:30") and combines it
// with a date string (e.g. "2026-05-01") to produce a dateTime string.
// Returns null if the time string is missing or in an unrecognised format.
function buildDateTime(dateStr, timeStr) {
  if (!timeStr) return null;

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3]?.toLowerCase();

  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return `${dateStr}T${String(hours).padStart(2, '0')}:${minutes}:00`;
}

function mapNotionToGoogleEvent(page) {
  const props = page.properties;

  // TODO 1: Extract the event title from the Name property.
  //
  // From the console.log output, Name.title is an array.
  // You want the plain_text field from the first element ([0]).
  // If the array is empty or missing, fall back to the string '(Untitled)'.
  //
  // EXAMPLE: accessing a 'Label' title property with a fallback:
  //   const label = props.Label?.title?.[0]?.plain_text || '(No label)';
  //
  // title and rich_text both use the same array structure — [0].plain_text
  // gives you the text from the first element.
  //
  // ↓ Remove this comment, keep the const, and replace YOUR_CODE_HERE
  const title = YOUR_CODE_HERE;

  // TODO 2: Extract the start date from the Timeline property.
  //
  // Timeline.date.start is a string like "2026-05-01" or "2026-05-01T17:30:00+10:00".
  // Use .split('T')[0] to strip any time component and keep only YYYY-MM-DD.
  //
  // EXAMPLE: extracting the date part from a 'Deadline' property:
  //   const deadline = props.Deadline?.date?.start?.split('T')[0];
  //
  //   "2026-05-01T17:30:00+10:00".split('T')[0]  →  "2026-05-01"
  //   "2026-05-01".split('T')[0]                 →  "2026-05-01"  (no T, unchanged)
  //
  // ↓ Replace YOUR_CODE_HERE
  const dateStart = YOUR_CODE_HERE;

  // Multi-day event handling — already implemented, no changes needed here.
  const rawDateEnd = props.Timeline?.date?.end;
  const dateEnd = rawDateEnd ? rawDateEnd.split('T')[0] : null;
  const googleEndDate = dateEnd ? addOneDay(dateEnd) : dateStart;

  // TODO 3: Return null if there is no date.
  // The sync runner checks for this and skips the page safely.
  //
  // ↓ Uncomment this line (remove the // at the start)
  // if (!dateStart) { return null; }

  // TODO 4: Build the base Google Calendar event object.
  //
  // Create a const called `googleEvent` with three fields: summary, start, and end.
  // For the start, use { date: dateStart }.
  // For the end, use { date: googleEndDate }.
  //
  // EXAMPLE: a Slack message follows the same idea — one object, multiple fields:
  //   const slackMessage = {
  //     channel: '#events',
  //     text: title,
  //     username: 'EventBot'
  //   };
  //
  // Your googleEvent is the same pattern, just with the field names Google Calendar expects.
  // summary is the event title.
  //
  // ↓ Uncomment this line and replace YOUR_CODE_HERE with the object
  // const googleEvent = YOUR_CODE_HERE;

  // -----------------------------------------------------------------------------
  // The fields below are already implemented — read them to understand the pattern,
  // since it's the same technique you used in TODOs 1 and 2 above.
  // -----------------------------------------------------------------------------

  // --- Start / End times ---
  // If the event has specific times set in Notion, upgrade from an all-day event
  // to a timed event by replacing start/end with dateTime + timeZone.
  //
  // Note: property names with emojis or spaces must use bracket notation:
  //   props['Event Start Time']  ← correct
  //   props.Event Start Time     ← syntax error
  const startTimeStr = props['Event Start Time']?.rich_text?.[0]?.plain_text;
  const endTimeStr = props['Event End Time']?.rich_text?.[0]?.plain_text;
  const startDateTime = buildDateTime(dateStart, startTimeStr);
  const endDateTime = buildDateTime(dateStart, endTimeStr);

  if (startDateTime) {
    googleEvent.start = { dateTime: startDateTime, timeZone: 'Australia/Melbourne' };
    googleEvent.end = endDateTime
      ? { dateTime: endDateTime, timeZone: 'Australia/Melbourne' }
      : { dateTime: startDateTime, timeZone: 'Australia/Melbourne' };
  }

  // TODO 5: Extract the venue and set it as the event location.
  //
  // Venue is a rich_text field — the same access pattern as Name in TODO 1,
  // but use bracket notation since you'll need it for the emoji fields later:
  //   props['Venue']?.rich_text?.[0]?.plain_text
  //
  // Only set googleEvent.location if a venue exists — don't set it to undefined.
  //
  // EXAMPLE: setting a colour field only when one exists:
  //   const colour = props['Colour']?.rich_text?.[0]?.plain_text;
  //   if (colour) googleEvent.colorId = colour;
  //
  // ↓ Replace YOUR_CODE_HERE on both lines
  const venue = YOUR_CODE_HERE;
  if (venue) googleEvent.location = YOUR_CODE_HERE;

  // TODO 6: Build the event description from Caption and Registration Link.
  //
  // Caption is a rich_text field — same access pattern as Venue above.
  // Registration Link is a url field — note the difference:
  //   rich_text: props['🔹 Caption']?.rich_text?.[0]?.plain_text
  //   url:       props['🔹 Registration Link']?.url   ← just .url, no array
  //
  // EXAMPLE: building a bio from an optional tagline and optional website:
  //   const tagline = props['Tagline']?.rich_text?.[0]?.plain_text;
  //   const website = props['Website']?.url;
  //
  //   const parts = [
  //     tagline,
  //     website ? `Visit us: ${website}` : null,
  //   ].filter(Boolean);
  //   const bio = parts.join('\n\n');
  //
  // Caption and Registration Link follow the same pattern — extract each one
  // first, then the .filter(Boolean) and .join below handle the combining.
  //
  // ↓ Replace each YOUR_CODE_HERE
  const caption = YOUR_CODE_HERE;
  const registrationLink = YOUR_CODE_HERE;

  const descriptionParts = [
    caption,
    registrationLink ? `Register: ${registrationLink}` : null,
  ].filter(Boolean); // .filter(Boolean) removes any null/undefined values from the array

  if (descriptionParts.length > 0) {
    googleEvent.description = descriptionParts.join('\n\n');
  }

  return googleEvent;
}

module.exports = { mapNotionToGoogleEvent };
