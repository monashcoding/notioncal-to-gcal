// Transforms a Notion page into the payload for a Discord "external" scheduled
// event (POST /guilds/{guild}/scheduled-events).
//
// Discord scheduled events are stricter than Google Calendar all-day events:
//   - They require an exact start AND end time (ISO8601 with an absolute instant).
//   - EXTERNAL events require a location string.
//   - The start time must be in the future (Discord rejects past events).
//
// This file is the single place that reconciles our all-day-first Notion data
// with those requirements. Returns null to signal "skip this page".

const { buildDateTime } = require('./mapFields');

const TIME_ZONE = 'Australia/Melbourne';

// How many hours long an event is assumed to be when only a start time (or no
// time at all) is given.
const DEFAULT_DURATION_HOURS = 3;

// Compute the offset (in ms) of a time zone from UTC at a given instant, so we
// can turn a Melbourne wall-clock time into an absolute UTC instant that
// accounts for daylight saving. Works with only the built-in Intl API.
function tzOffsetMs(timeZone, date) {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tz = new Date(date.toLocaleString('en-US', { timeZone }));
  return tz.getTime() - utc.getTime();
}

// Turn a naive "YYYY-MM-DDTHH:MM:SS" wall-clock string (interpreted in TIME_ZONE)
// into a UTC ISO string suitable for Discord's scheduled_start/end_time.
function wallTimeToUtcIso(naive) {
  const [datePart, timePart] = naive.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);
  // First pretend the wall time is already UTC, then subtract the zone offset
  // measured at (approximately) that instant to get the true UTC instant.
  const asUtc = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = tzOffsetMs(TIME_ZONE, new Date(asUtc));
  return new Date(asUtc - offset).toISOString();
}

// Parse a 24-hour "HH:MM" env default into a naive datetime string for a date.
function defaultTime(dateStr, hhmm, fallback) {
  const [h, m] = (hhmm || fallback).split(':');
  return `${dateStr}T${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}:00`;
}

function mapNotionToDiscordEvent(page) {
  const props = page.properties;

  const title = props.Name?.title?.[0]?.plain_text || '(Untitled)';
  const dateStart = props.Timeline?.date?.start?.split('T')[0];
  if (!dateStart) return null; // no date → nothing to schedule

  // Resolve start/end wall-clock times. Prefer the Notion time fields (parsed
  // identically to Google via buildDateTime); fall back to a configurable
  // default window for all-day events.
  const startTimeStr = props['Event Start Time']?.rich_text?.[0]?.plain_text;
  const endTimeStr = props['Event End Time']?.rich_text?.[0]?.plain_text;

  const startNaive =
    buildDateTime(dateStart, startTimeStr) ||
    defaultTime(dateStart, process.env.DISCORD_DEFAULT_START, '18:00');

  let endNaive = buildDateTime(dateStart, endTimeStr);
  if (!endNaive) {
    // No explicit end. If there was an explicit start, add the default duration;
    // otherwise use the configured default end window.
    if (startTimeStr) {
      const start = new Date(`${startNaive}Z`); // treat components literally
      start.setUTCHours(start.getUTCHours() + DEFAULT_DURATION_HOURS);
      endNaive = start.toISOString().replace('Z', '').split('.')[0];
    } else {
      endNaive = defaultTime(dateStart, process.env.DISCORD_DEFAULT_END, '21:00');
    }
  }

  const startIso = wallTimeToUtcIso(startNaive);
  const endIso = wallTimeToUtcIso(endNaive);

  // Discord rejects events whose start is in the past — skip them cleanly.
  if (new Date(startIso).getTime() <= Date.now()) return null;

  // EXTERNAL events require a location. Venue → registration link → placeholder.
  const venue = props['Venue']?.rich_text?.[0]?.plain_text;
  const rawRegistrationLink = props['🔹 Registration Link']?.rollup?.array?.[0]?.url;
  const location = venue || rawRegistrationLink || 'See event details';

  const caption = props['🔹 Caption']?.rollup?.array?.[0]?.rich_text?.[0]?.plain_text;

  const payload = {
    name: title,
    scheduled_start_time: startIso,
    scheduled_end_time: endIso,
    privacy_level: 2, // GUILD_ONLY (the only allowed value)
    entity_type: 3, // EXTERNAL
    entity_metadata: { location },
  };
  if (caption) payload.description = caption.slice(0, 1000); // Discord max 1000

  return payload;
}

module.exports = { mapNotionToDiscordEvent };
