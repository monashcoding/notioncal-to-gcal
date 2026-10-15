const notion = require('../auth/notion');
const { DATE_PROPERTY_NAMES, findDatePropertyNames, getEventDate } = require('./notionProps');

// The rollup that decides whether an event belongs on the public calendar.
// It lives on the *related* marketing ticket, not on the calendar page itself,
// so a page can look completely normal in Notion while being invisible to sync.
const SYNC_PROPERTY = '🔹 Sync to Public Calendar';

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// Whether this page is marked for the public calendar.
//
// This used to be a server-side Notion filter. It is evaluated here instead so
// that an unmarked page still comes back from the query: the runner can then
// tell "not marked for sync" apart from "deleted in Notion" and log it, rather
// than silently treating the page as gone (and deleting its Google event).
function isSyncEnabled(page) {
  const array = page.properties?.[SYNC_PROPERTY]?.rollup?.array;
  if (!Array.isArray(array)) return false;
  return array.some((entry) => entry?.checkbox === true);
}

// Events are kept on the calendar for a year after they start, then expire.
// A rolling window (rather than "this calendar year") means events age out a
// few at a time instead of all at once every 1 January.
function retentionCutoff() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

// Fetch every page whose event started within the retention window.
//
// The query filter is built from the live database schema rather than a
// hard-coded property name: filtering on a property that has been renamed makes
// Notion reject the whole query, which stopped every sync. If no accepted date
// property exists at all, the pages are fetched unfiltered and the cutoff is
// applied in code instead.
//
// Returns { pages, trustworthy }. `trustworthy` is false when the schema is not
// what the sync expects (no date property, or the sync rollup is missing). The
// fetch still succeeds so creates and updates carry on, but the runner must not
// delete anything on the strength of it.
async function fetchNotionPages() {
  const databaseId = process.env.NOTION_DATABASE_ID;
  const schema = await notion.databases.retrieve({ database_id: databaseId });

  const dateProps = findDatePropertyNames(schema.properties);
  const hasSyncProp = Boolean(schema.properties?.[SYNC_PROPERTY]);
  const cutoff = retentionCutoff();

  if (!dateProps.length) {
    console.warn(
      `[${timestamp()}] No date property named ${DATE_PROPERTY_NAMES.map((n) => `"${n}"`).join(' or ')} ` +
        `in the Notion database — fetching without a date filter`
    );
  }
  if (!hasSyncProp) {
    console.warn(`[${timestamp()}] Notion database has no "${SYNC_PROPERTY}" property — no page will sync`);
  }

  // A page belongs to this year if any of its date columns does, so a page
  // dated in either column is fetched.
  const conditions = dateProps.map((property) => ({ property, date: { on_or_after: cutoff } }));
  const filter = conditions.length > 1 ? { or: conditions } : conditions[0];

  const pages = [];
  let cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
      ...(filter && { filter }),
    });

    pages.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);

  // The OR filter can let a page in on a column that getEventDate does not
  // prefer, and the unfiltered fallback lets in every year. Re-apply the cutoff
  // to the date that will actually be used; undated pages stay in so they are
  // reported as skipped rather than looking deleted.
  const inRange = pages.filter((page) => {
    const start = getEventDate(page)?.start;
    return !start || start.split('T')[0] >= cutoff;
  });

  return { pages: inRange, trustworthy: dateProps.length > 0 && hasSyncProp };
}

// Decide what to do about a synced page that the query did not return.
//
// Absence from the query is not evidence of anything on its own: a renamed
// property or a filter that suddenly matches nothing makes *every* page absent,
// and treating that as "deleted" once wiped the whole calendar. So each absent
// page is looked up directly, and its mirrors are only removed for a reason the
// page itself confirms.
//
// Returns { remove: boolean, reason: string }.
async function explainMissingPage(pageId) {
  let page;
  try {
    page = await notion.pages.retrieve({ page_id: pageId });
  } catch (err) {
    if (err.code === 'object_not_found') return { remove: true, reason: 'removed from Notion' };
    // Network trouble, rate limiting, etc. — try again next run.
    return { remove: false, reason: `could not check the page (${err.message})` };
  }

  if (page.archived || page.in_trash) return { remove: true, reason: 'removed from Notion' };
  if (!isSyncEnabled(page)) return { remove: true, reason: `no longer marked "${SYNC_PROPERTY}"` };

  const start = getEventDate(page)?.start;
  // Deliberately not a deletion: when a date column is renamed or replaced,
  // every page reads as undated, and that must not empty the calendar.
  if (!start) {
    return {
      remove: false,
      reason: 'no Timeline/Date value found on the page — set a date, or untick sync to remove it',
    };
  }
  if (start.split('T')[0] < retentionCutoff()) {
    return { remove: true, reason: 'event is more than a year old' };
  }

  return { remove: false, reason: 'page is current and marked, but the database query did not return it' };
}

module.exports = { fetchNotionPages, explainMissingPage, isSyncEnabled, SYNC_PROPERTY };
