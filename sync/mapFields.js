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
 *       "title": [
 *         { "plain_text": "Trivia Night", ... }
 *       ]
 *     },
 *     "Timeline": {
 *       "date": {
 *         "start": "2026-05-01",
 *         "end": null
 *       }
 *     }
 *   }
 *
 * Docs (use this to understand other property types):
 * https://developers.notion.com/reference/property-value-object
 *
 * -----------------------------------------------------------------------------
 * ASYNC/AWAIT — A QUICK NOTE
 * -----------------------------------------------------------------------------
 * You may have seen async/await in JavaScript but not used it much yet.
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
 * You can think of it like: "give me this value IF it exists, otherwise undefined"
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

function mapNotionToGoogleEvent(page) {
  const props = page.properties;

  // TODO 1: Extract the event title from the Name property.
  //
  // From the console.log output you ran above, you can see that Name.title
  // is an array. You want the plain_text field from the first element.
  //
  // Hint: arrays are zero-indexed, so the first element is [0].
  // If the array is empty or missing, fall back to the string '(Untitled)'.
  //
  // You've used this pattern before with req.body in your To-Do API —
  // same idea, just reading from a different object.
  //
  // ↓ Remove this comment, keep the const, and replace YOUR_CODE_HERE
  const title = YOUR_CODE_HERE;

  // TODO 2: Extract the start date from the Timeline property.
  //
  // From the console.log output, Timeline.date.start is a string like:
  //   "2026-05-01"          ← date-only (easy case)
  //   "2026-05-01T17:30:00+10:00"  ← date with time (needs cleanup)
  //
  // Use .split('T')[0] to strip the time part and keep only YYYY-MM-DD.
  // This works on both cases — splitting "2026-05-01" by 'T' just returns
  // the same string since there's no 'T' to split on.
  //
  // ↓ Replace YOUR_CODE_HERE
  const dateStart = YOUR_CODE_HERE;

  // TODO 3: Return null if there is no date.
  //
  // Some Notion pages don't have a date set yet. If dateStart is undefined
  // or empty, return null. The sync runner checks for this and skips the page.
  // Don't remove this — without it, you'd send broken data to Google Calendar.
  //
  // ↓ Uncomment this line (remove the // at the start)
  // if (!dateStart) { return null; }

  // TODO 4: Build and return the Google Calendar event object.
  //
  // Use the structure shown in the header above. For a single all-day event,
  // end.date is the same as start.date.
  //
  // This is just building a plain JavaScript object — the same thing you did
  // when creating a new to-do item in your To-Do API.
  //
  // ↓ Uncomment this line and replace YOUR_CODE_HERE with the full object
  // return YOUR_CODE_HERE;
}

module.exports = { mapNotionToGoogleEvent };
