/**
 * This file is already complete — you do not need to edit it.
 *
 * Read through it to understand the overall flow, but don't worry if you don't
 * understand every line. Focus on the three numbered steps in the comments below
 * and how they connect the files you ARE implementing.
 *
 * Some syntax here (like Object.entries, Set, and arrow functions) may be new —
 * that's fine. Follow the flow at a high level:
 *   1. Fetch pages from Notion        → your fetchNotion.js
 *   2. Detect deleted pages           → calls your deleteEvent()
 *   3. Create or update each page     → calls your mapFields.js and createEvent/updateEvent()
 */

const { fetchNotionPages } = require('./fetchNotion');
const { mapNotionToGoogleEvent } = require('./mapFields');
const { createEvent, updateEvent, deleteEvent } = require('./googleCalendar');
const { loadState, saveState } = require('./stateManager');

// A helper that returns the current time as a formatted string: [YYYY-MM-DD HH:MM:SS]
// .toISOString() gives "2026-05-01T10:00:00.000Z", we clean it up for readability.
function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

// The main sync function — called on startup and every 30 minutes by index.js.
// It's async because it makes many API calls (fetch, create, update, delete).
async function runSync() {
  console.log(`[${timestamp()}] Sync started`);

  // These counters track what happened during the sync for the summary log at the end.
  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;

  // Load the saved { notionPageId: googleEventId } map from sync-state.json.
  // On the very first run this returns {}, which is fine.
  let syncState = loadState();

  // --- Step 1: Fetch all current Notion pages ---
  // We wrap this in try/catch because if the fetch fails (e.g. bad token, network error)
  // we should abort the whole run — we can't safely detect deletions without the full list.
  let pages;
  try {
    pages = await fetchNotionPages(); // calls YOUR fetchNotion.js
    console.log(`[${timestamp()}] Fetched ${pages.length} pages from Notion`);
  } catch (err) {
    console.error(`[${timestamp()}] Failed to fetch Notion pages:`, err.message);
    return; // abort this run entirely
  }

  // Build a Set of all Notion page IDs that currently exist.
  // A Set is like an array but optimised for fast "does this exist?" lookups.
  // .map((p) => p.id) is an arrow function — it's shorthand for:
  //   pages.map(function(p) { return p.id; })
  // It creates a new array of just the IDs from the pages array.
  const notionPageIds = new Set(pages.map((p) => p.id));

  // --- Step 2: Detect deleted Notion pages and remove their Google events ---
  // Object.entries(syncState) converts { key: value, ... } into an array of [key, value] pairs.
  // for...of loops over each pair. The [notionId, googleEventId] pulls them apart in one step
  // (this is called "destructuring" — like unpacking a pair of values at once).
  //
  // Any notionId in syncState that is NOT in the current notionPageIds was deleted from Notion.
  for (const [notionId, googleEventId] of Object.entries(syncState)) {
    if (!notionPageIds.has(notionId)) {
      try {
        await deleteEvent(googleEventId); // calls YOUR googleCalendar.js
        console.log(
          `[${timestamp()}] Deleted: Google event ${googleEventId} (Notion page was removed)`
        );
        // Remove this entry from syncState so it's not saved back to the file
        delete syncState[notionId];
        deleted++;
      } catch (err) {
        // One failed deletion should not abort the whole run — log and continue
        console.error(
          `[${timestamp()}] Failed to delete event ${googleEventId}:`,
          err.message
        );
      }
    }
  }

  // --- Step 3: Create or update Google events for all current Notion pages ---
  for (const page of pages) {
    // Transform the Notion page into a Google Calendar event object.
    // This calls YOUR mapFields.js — if it returns null, the page has no date.
    const eventData = mapNotionToGoogleEvent(page);

    if (!eventData) {
      // mapFields returned null — page has no date set, skip it
      const name = page.properties.Name?.title?.[0]?.plain_text || page.id;
      console.log(`[${timestamp()}] Skipping page "${name}": no date set.`);
      skipped++;
      continue; // move to the next page in the loop
    }

    // Check if this Notion page has been synced before.
    // If syncState has its ID as a key, we have an existing Google event to update.
    const existingGoogleId = syncState[page.id];

    if (existingGoogleId) {
      // Page was synced before — update the existing Google event in place
      try {
        await updateEvent(existingGoogleId, eventData); // calls YOUR googleCalendar.js
        console.log(`[${timestamp()}] Updated: "${eventData.summary}"`);
        updated++;
      } catch (err) {
        console.error(
          `[${timestamp()}] Failed to update "${eventData.summary}":`,
          err.message
        );
      }
    } else {
      // New page — create a Google Calendar event and remember the ID mapping
      try {
        const newGoogleId = await createEvent(eventData); // calls YOUR googleCalendar.js
        syncState[page.id] = newGoogleId; // store the mapping for next time
        console.log(`[${timestamp()}] Created: "${eventData.summary}"`);
        created++;
      } catch (err) {
        console.error(
          `[${timestamp()}] Failed to create "${eventData.summary}":`,
          err.message
        );
      }
    }
  }

  // Save the updated ID map back to sync-state.json for the next run
  saveState(syncState);

  console.log(
    `[${timestamp()}] Sync complete. Created: ${created}, Updated: ${updated}, Deleted: ${deleted}, Skipped: ${skipped}`
  );
}

module.exports = { runSync };
