// Tolerant readers for Notion page properties.
//
// Property *names* are edited by people in the Notion UI, and every rename used
// to break the sync: the database query errors on an unknown property, and a
// read like `props.Timeline` quietly returns undefined. These helpers resolve
// properties by a list of accepted names (and by type where a database can only
// have one, like the title), so a renamed or missing optional field degrades to
// "no value" instead of stopping the run.

// Accepted names for the event's date, in order of preference. A page uses the
// first of these that actually holds a date, so both columns can coexist while
// one is being migrated to the other.
const DATE_PROPERTY_NAMES = ['Timeline', 'Date'];

// Notion appends " (1)", " (2)"... when a new property collides with an existing
// name. Ignoring that suffix (and case/whitespace) means a duplicate created by
// accident still matches.
function normalizeName(name) {
  return String(name).replace(/\s*\(\d+\)\s*$/, '').trim().toLowerCase();
}

const ACCEPTED_DATE_NAMES = DATE_PROPERTY_NAMES.map(normalizeName);

function dateRank(name) {
  return ACCEPTED_DATE_NAMES.indexOf(normalizeName(name));
}

// Names of the date-typed properties in `properties` (a page's or the database
// schema's) that count as the event date, most preferred first.
function findDatePropertyNames(properties) {
  return Object.entries(properties || {})
    .filter(([name, prop]) => prop?.type === 'date' && dateRank(name) !== -1)
    .sort(([a], [b]) => dateRank(a) - dateRank(b))
    .map(([name]) => name);
}

// The page's event date ({ start, end, time_zone }) from the first accepted
// date property that is filled in, or null when none is.
function getEventDate(page) {
  const props = page?.properties;
  for (const name of findDatePropertyNames(props)) {
    const date = props[name].date;
    if (date?.start) return date;
  }
  return null;
}

// Every Notion database has exactly one title property, whatever it is called.
function getTitle(page) {
  const props = page?.properties || {};
  const titleProp = Object.values(props).find((p) => p?.type === 'title');
  return titleProp?.title?.map((t) => t.plain_text).join('') || null;
}

module.exports = { DATE_PROPERTY_NAMES, findDatePropertyNames, getEventDate, getTitle };
