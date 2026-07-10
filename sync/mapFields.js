

function addOneDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().split('T')[0];
}


function buildDateTime(dateStr, timeStr) {
  if (!timeStr) return null;

  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ?? '00';
  const period = match[3]?.toLowerCase();

  // Default to PM unless AM is explicitly specified
  if (period === 'am') {
    if (hours === 12) hours = 0;
  } else {
    if (hours !== 12) hours += 12;
  }

  return `${dateStr}T${String(hours).padStart(2, '0')}:${minutes}:00`;
}


function mapNotionToGoogleEvent(page) {
  const props = page.properties;

  const title = props.Name?.title?.[0]?.plain_text || '(Untitled)';

 
  
  const dateStart = props.Timeline?.date?.start?.split('T')[0];

  // Multi-day event handling — already implemented, no changes needed here.
  const rawDateEnd = props.Timeline?.date?.end;
  const dateEnd = rawDateEnd ? rawDateEnd.split('T')[0] : null;
  const googleEndDate = dateEnd ? addOneDay(dateEnd) : addOneDay(dateStart);
 
  
  if (!dateStart) { return null; }

  
  // All-day event by default. `dateTime: null` explicitly clears any stale
  // dateTime on the existing Google event so events.patch doesn't leave both
  // `date` and `dateTime` set (which Google rejects as "Invalid start time").
  const googleEvent = {
    summary: title,
    start: { date: dateStart, dateTime: null },
    end: { date: googleEndDate, dateTime: null },
  };


  const startTimeStr = props['Event Start Time']?.rich_text?.[0]?.plain_text;
  const endTimeStr = props['Event End Time']?.rich_text?.[0]?.plain_text;
  const startDateTime = buildDateTime(dateStart, startTimeStr);
  const endDateTime = buildDateTime(dateStart, endTimeStr);

  if (startDateTime) {
    // Timed event. `date: null` clears the all-day `date` field so patch doesn't
    // leave both `date` and `dateTime` set on a previously all-day event.
    googleEvent.start = { dateTime: startDateTime, timeZone: 'Australia/Melbourne', date: null };
    googleEvent.end = endDateTime
      ? { dateTime: endDateTime, timeZone: 'Australia/Melbourne', date: null }
      : { dateTime: startDateTime, timeZone: 'Australia/Melbourne', date: null };
  }


  const venue = props['Venue']?.rich_text?.[0]?.plain_text;
  if (venue) googleEvent.location = venue;

  
  const caption = props['🔹 Caption']?.rollup?.array?.[0]?.rich_text?.[0]?.plain_text;
  const rawRegistrationLink = props['🔹 Registration Link']?.rollup?.array?.[0]?.url;

  // Prepend https:// if the link has no scheme, so Google Calendar renders it as a clickable link.
  const registrationLink = rawRegistrationLink
    ? (/^https?:\/\//i.test(rawRegistrationLink) ? rawRegistrationLink : `https://${rawRegistrationLink}`)
    : null;

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
