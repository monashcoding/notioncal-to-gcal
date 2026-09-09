const notion = require('../auth/notion');

// The rollup that decides whether an event belongs on the public calendar.
// It lives on the *related* marketing ticket, not on the calendar page itself,
// so a page can look completely normal in Notion while being invisible to sync.
const SYNC_PROPERTY = '🔹 Sync to Public Calendar';

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

async function fetchNotionPages() {
  const pages = [];
  let cursor = undefined;

  const cutoff = new Date().getFullYear() + '-01-01';

  do {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,

      filter: {
        property: 'Timeline',
        date: { on_or_after: cutoff },
      },
    });

    pages.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);

  return pages;
}

module.exports = { fetchNotionPages, isSyncEnabled, SYNC_PROPERTY };
