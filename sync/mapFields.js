

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


const HAS_PERIOD = /(am|pm)/i;
const TIME_ZONE = 'Australia/Melbourne';

// A Notion date carries a time whenever its ISO string has a clock component.
// Date-only values look like "2026-08-07"; date-and-time values look like
// "2026-08-07T18:00:00.000+10:00" (time_zone null, offset inline) or
// "2026-08-07T08:00:00.000Z" (time_zone named separately).
const HAS_CLOCK = /T\d{2}:\d{2}/;

function hasClock(iso) {
  return typeof iso === 'string' && HAS_CLOCK.test(iso);
}

// Convert an absolute Notion timestamp into a naive Melbourne wall-clock string.
// Going via the instant handles both of Notion's encodings, and a page authored
// in another timezone still lands at the correct local time on this calendar.
function toWallClock(iso) {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(instant)
    .reduce((acc, part) => ((acc[part.type] = part.value), acc), {});

  // Some ICU builds render midnight as hour "24" under hour12:false.
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}`;
}

function logTime(title, messages) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  for (const m of messages) console.warn(`[${ts}] Time warning for "${title}": ${m}`);
}

// Resolve the Notion start/end time fields into a *valid* wall-clock range.
//
// The PM default in buildDateTime is deliberate and load-bearing — this calendar
// is mostly evening events, where "6"-"8" correctly means 6pm-8pm. But the same
// rule turns a morning event written as "10"-"2" into 10pm-2pm: an end before
// its start. Google rejects that outright with 400 "The specified time range is
// empty", and because syncRunner catches per-event errors, the whole event —
// title, venue, and crucially the *date* — then silently stops syncing until
// somebody edits the time field into an unambiguous format.
//
// So the PM reading is only overridden when it is provably wrong: an end at or
// before the start. If reading a bare start time as AM fixes that, we do it; if
// not, we drop both times and let the event sync as all-day, so a bad time field
// can never block the date from updating again.
//
// The end time is anchored to the Timeline's *end* date when there is one, so a
// multi-day event that runs 6pm Friday to 6pm Sunday is one continuous event
// rather than a zero-length blip on the Friday. Notion keeps the dates in
// Timeline and the clock times in the time fields; neither has to restate the
// other.
//
// Returns { start, end, warnings } with naive "YYYY-MM-DDTHH:MM:SS" strings.
function resolveTimeRange(startDate, endDate, startStr, endStr) {
  const warnings = [];
  const dateStr = startDate;
  let start = buildDateTime(startDate, startStr);
  let end = buildDateTime(endDate || startDate, endStr);

  if (startStr && !start) warnings.push(`unrecognised Event Start Time ${JSON.stringify(startStr)}`);
  if (endStr && !end) warnings.push(`unrecognised Event End Time ${JSON.stringify(endStr)}`);

  if (start && end && end <= start) {
    const amStart =
      startStr && !HAS_PERIOD.test(startStr)
        ? buildDateTime(dateStr, `${startStr.trim()}am`)
        : null;

    if (amStart && amStart < end) {
      warnings.push(
        `read start ${JSON.stringify(startStr)} as AM — a PM reading (${start.slice(11, 16)}) ` +
          `would end before it starts`
      );
      start = amStart;
    } else {
      warnings.push(
        `end ${JSON.stringify(endStr)} is not after start ${JSON.stringify(startStr)}; ` +
          `syncing as all-day so the date still updates`
      );
      start = null;
      end = null;
    }
  }

  return { start, end, warnings };
}


// Decide an event's start/end from the two things Notion can offer, in order of
// trust:
//
//   1. A time on the Timeline date itself. Structured, unambiguous, carries its
//      own timezone, and expresses a multi-day range natively. Nothing to parse
//      and nothing to guess.
//   2. The "Event Start Time" / "Event End Time" text fields. Free text, so the
//      parser has to infer AM vs PM — this is the path that read "10" as 10pm
//      and wedged the calendar. Kept as a fallback so the ~18 events already
//      written this way keep working, and so pages convert one at a time rather
//      than in one migration.
//
// Returns { start, end, warnings, source } with naive wall-clock strings.
function resolveEventTimes(timelineDate, startStr, endStr) {
  const rawStart = timelineDate?.start || null;
  const rawEnd = timelineDate?.end || null;
  const startDate = rawStart ? rawStart.split('T')[0] : null;
  const endDate = rawEnd ? rawEnd.split('T')[0] : null;

  if (!startDate) return { start: null, end: null, warnings: [], source: 'none' };

  if (!hasClock(rawStart)) {
    return { ...resolveTimeRange(startDate, endDate, startStr, endStr), source: 'text' };
  }

  const warnings = [];
  const start = toWallClock(rawStart);

  // An end time on Timeline wins; otherwise fall back to the text end field,
  // anchored to the Timeline's end date so multi-day events stay continuous.
  const end = hasClock(rawEnd)
    ? toWallClock(rawEnd)
    : buildDateTime(endDate || startDate, endStr);

  if (start && end && end <= start) {
    warnings.push(
      `Timeline end (${end.slice(0, 16)}) is not after start (${start.slice(0, 16)}); ` +
        `syncing as all-day so the date still updates`
    );
    return { start: null, end: null, warnings, source: 'timeline' };
  }

  // Surface a stale leftover text field rather than silently ignoring it — if
  // the two disagree, somebody is editing the field that no longer counts.
  const textStart = buildDateTime(startDate, startStr);
  if (textStart && textStart !== start) {
    warnings.push(
      `Timeline says ${start.slice(11, 16)} but Event Start Time says ` +
        `${JSON.stringify(startStr)} (${textStart.slice(11, 16)}); using Timeline — ` +
        `clear the text field to silence this`
    );
  }

  return { start, end, warnings, source: 'timeline' };
}

function mapNotionToGoogleEvent(page) {
  const props = page.properties;

  const title = props.Name?.title?.[0]?.plain_text || '(Untitled)';

 
  
  const dateStart = props.Timeline?.date?.start?.split('T')[0];

  // Bail before addOneDay, which would throw on a missing date. syncRunner calls
  // this outside its per-event try/catch, so a throw here takes down the run —
  // returning null is what makes "no date set" a skip rather than an outage.
  if (!dateStart) { return null; }

  // Multi-day event handling. Google treats an all-day event's end date as
  // exclusive, hence addOneDay.
  const rawDateEnd = props.Timeline?.date?.end;
  const dateEnd = rawDateEnd ? rawDateEnd.split('T')[0] : null;
  const googleEndDate = dateEnd ? addOneDay(dateEnd) : addOneDay(dateStart);

  
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
  const { start: startDateTime, end: endDateTime, warnings } = resolveEventTimes(
    props.Timeline?.date,
    startTimeStr,
    endTimeStr
  );
  if (warnings.length) logTime(title, warnings);

  if (startDateTime) {
    // Timed event. `date: null` clears the all-day `date` field so patch doesn't
    // leave both `date` and `dateTime` set on a previously all-day event.
    googleEvent.start = { dateTime: startDateTime, timeZone: TIME_ZONE, date: null };
    googleEvent.end = endDateTime
      ? { dateTime: endDateTime, timeZone: TIME_ZONE, date: null }
      : { dateTime: startDateTime, timeZone: TIME_ZONE, date: null };
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

// resolveEventTimes is exported so other sinks (e.g. Discord events) resolve an
// event's start and end by the exact same rules as Google — keeping every
// destination in agreement about when an event actually happens. buildDateTime
// and resolveTimeRange are exported for tests and for callers that only have
// the legacy text fields.
module.exports = { mapNotionToGoogleEvent, buildDateTime, resolveTimeRange, resolveEventTimes };
