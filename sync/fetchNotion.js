/**
 * TASK 1: Fetch pages from the Notion database, filtered to this year's events.
 *
 * The fetch loop and pagination are already written — your job is to add a
 * `filter` to the query so only the right pages come back.
 *
 * This is similar to how in your To-Do API you might filter an array with
 * .filter() — except here, you're telling Notion's API to filter server-side
 * before sending the results back.
 *
 * -----------------------------------------------------------------------------
 * ASYNC/AWAIT
 * -----------------------------------------------------------------------------
 * This function is async because fetching from Notion takes time (network call).
 * The `await` before notion.databases.query() pauses execution until Notion
 * responds — similar to waiting for fs.readFile() in Lesson 1, but cleaner syntax.
 *
 * Docs: https://javascript.info/async-await
 *
 * -----------------------------------------------------------------------------
 * HOW NOTION FILTERS WORK
 * -----------------------------------------------------------------------------
 * When you query a Notion database, you can pass a `filter` object to narrow
 * down the results. Think of it like SQL's WHERE clause.
 *
 * A single filter looks like this:
 *   { property: 'Type', select: { equals: 'Event' } }
 *
 * To match EITHER of two values (OR logic):
 *   {
 *     or: [
 *       { property: 'Type', select: { equals: 'Event' } },
 *       { property: 'Type', select: { equals: 'Social' } }
 *     ]
 *   }
 *
 * To require ALL conditions (AND logic):
 *   {
 *     and: [ filter1, filter2 ]
 *   }
 *
 * You can nest them — an `or` block counts as one filter inside an `and` block.
 *
 * Docs: https://developers.notion.com/reference/post-database-query-filter
 * Date filter conditions: https://developers.notion.com/reference/post-database-query-filter#date-filter-condition
 *
 * -----------------------------------------------------------------------------
 * WORKED EXAMPLE (different database, same idea)
 * -----------------------------------------------------------------------------
 * Imagine a "Tasks" database. You want tasks where:
 *   - Status is 'Active' OR Status is 'In Progress'   ← OR block
 *   - AND DueDate is on or after 1 July this year     ← date condition
 *
 * Step 1 — build the date string:
 *   const midYear = new Date().getFullYear() + '-07-01';
 *   // midYear is now e.g. '2026-07-01'
 *
 * Step 2 — build the filter:
 *   filter: {
 *     and: [
 *       {
 *         or: [
 *           { property: 'Status', select: { equals: 'Active' } },
 *           { property: 'Status', select: { equals: 'In Progress' } }
 *         ]
 *       },
 *       { property: 'DueDate', date: { on_or_after: midYear } }
 *     ]
 *   }
 *
 * Your task uses the same pattern — `and` wrapping an `or` block plus a date
 * condition — just with different property names and values from your database.
 *
 * -----------------------------------------------------------------------------
 * PAGINATION
 * -----------------------------------------------------------------------------
 * Notion returns at most 100 results per request. The do/while loop below
 * handles this automatically using next_cursor — don't change it.
 */

const notion = require('../auth/notion');

async function fetchNotionPages() {
  const pages = [];
  let cursor = undefined;

  // TODO 1: Calculate the cutoff date — January 1st of the current year.
  //
  // Hint: new Date().getFullYear() returns the current year as a number (e.g. 2026).
  // You need a string in the format 'YYYY-01-01'.
  //
  // You can build a string by combining values with +:
  //   'hello ' + 'world'  →  'hello world'
  //   2026 + '-01-01'     →  '2026-01-01'
  //
  // ↓ Replace YOUR_CODE_HERE
  const cutoff = YOUR_CODE_HERE;

  do {
    const response = await notion.databases.query({
      database_id: process.env.NOTION_DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,

      // TODO 2: Add a filter that combines two conditions with `and`:
      //
      // Condition A — Type is 'Event' OR Type is 'Social':
      //   Use an `or` block with two select filters (see header above for the syntax)
      //
      // Condition B — Timeline is on or after the cutoff date:
      //   { property: 'Timeline', date: { on_or_after: cutoff } }
      //
      // Wrap both conditions in an `and` block so BOTH must be true.
      //
      // Docs: https://developers.notion.com/reference/post-database-query-filter
      //
      // ↓ Uncomment this line and replace YOUR_CODE_HERE with the full filter object
      // filter: YOUR_CODE_HERE,
    });

    pages.push(...response.results);
    cursor = response.next_cursor;
  } while (cursor);

  return pages;
}

module.exports = { fetchNotionPages };
