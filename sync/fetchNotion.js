const notion = require('../auth/notion');

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
        and: [
          {
            or: [
              { property: "Type", select: { equals: "Social" } },
              { property: "Type", select: { equals: "Event" } }
            ]
          },
          { property: "Timeline", date: { on_or_after: cutoff } },
          { property: "🔹 Sync to Public Calendar", rollup: { any: { checkbox: { equals: true } } } }
        ]
      }
    });

    pages.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);

  return pages;
}

module.exports = { fetchNotionPages };
