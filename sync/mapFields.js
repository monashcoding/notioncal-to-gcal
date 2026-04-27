/**
 * Transforms a raw Notion page object into a Google Calendar event object.
 *
 * This is the ONLY place where Notion fields are mapped to Google Calendar fields.
 * To add a new field later (e.g. Location), edit ONLY this function — you don't
 * need to touch syncRunner.js or any other file.
 *
 * Returns null if the page has no date set (caller should skip it).
 */
function mapNotionToGoogleEvent(page) {
  const props = page.properties;

  // --- Name → summary ---
  // Notion title properties are arrays of rich text objects; we want plain text.
  const title = props.Name?.title?.[0]?.plain_text || '(Untitled)';

  // --- Timeline → start.date / end.date ---
  // Notion date properties have a nested .date.start field (YYYY-MM-DD string).
  // Split on 'T' to strip any time component — Google all-day events require YYYY-MM-DD only
  const dateStart = props.Timeline?.date?.start?.split('T')[0];

  if (!dateStart) {
    // Signal to syncRunner that this page should be skipped
    return null;
  }

  // Google Calendar distinguishes between all-day events (date) and timed events (dateTime).
  // Using 'date' (YYYY-MM-DD) creates an all-day event with no time zone.
  // Using 'dateTime' would add a specific time and break the all-day display.
  const googleEvent = {
    summary: title,
    start: { date: dateStart },
    end: { date: dateStart }, // For a single all-day event, end = start
  };

  // TODO: add Location here
  // const location = props.Location?.rich_text?.[0]?.plain_text;
  // if (location) googleEvent.location = location;

  // TODO: add Registration link here
  // const registrationLink = props['Registration Link']?.url;
  // if (registrationLink) googleEvent.description = registrationLink;

  // TODO: add Caption here (append to description)
  // const caption = props.Caption?.rich_text?.[0]?.plain_text;
  // if (caption) googleEvent.description = [googleEvent.description, caption].filter(Boolean).join('\n\n');

  return googleEvent;
}

module.exports = { mapNotionToGoogleEvent };
