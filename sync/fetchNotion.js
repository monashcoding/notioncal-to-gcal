const notion = require('../auth/notion');

/**
 * Fetches every page from the Notion database, handling pagination automatically.
 *
 * The Notion API returns at most 100 results per request. If there are more pages,
 * the response includes a `next_cursor` value. We keep querying until there is none.
 *
 * Note: Notion API rate limit is 3 requests/second. For a small club calendar
 * this loop will make 1–2 requests total, so no throttling is needed. If the
 * database ever grows very large, add a delay between loop iterations here.
 */
async function fetchNotionPages() {
  const pages = [];
  let cursor = undefined;

  const cutoff = `${new Date().getFullYear()}-01-01`;

  do {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100, // Maximum allowed by Notion API
      filter: {
        and: [
          {
            or: [
              { property: 'Type', select: { equals: 'Event' } },
              { property: 'Type', select: { equals: 'Social' } },
            ],
          },
          { property: 'Timeline', date: { on_or_after: cutoff } },
        ],
      },
    });

    pages.push(...response.results);
    // next_cursor is null when there are no more pages
    cursor = response.next_cursor;
  } while (cursor);

  return pages;
}

module.exports = { fetchNotionPages };
