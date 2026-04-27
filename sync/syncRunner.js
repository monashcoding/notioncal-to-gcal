const { fetchNotionPages } = require('./fetchNotion');
const { mapNotionToGoogleEvent } = require('./mapFields');
const { createEvent, updateEvent, deleteEvent } = require('./googleCalendar');
const { loadState, saveState } = require('./stateManager');

// Returns the current date and time as [YYYY-MM-DD HH:MM:SS]
function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Core sync orchestration. Called on startup and every 30 minutes.
 *
 * Flow:
 *   1. Fetch all current Notion pages
 *   2. Delete Google events for pages that no longer exist in Notion
 *   3. Create or update Google events for all current Notion pages
 *   4. Save updated sync state to disk
 */
async function runSync() {
  console.log(`[${timestamp()}] Sync started`);

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;

  // Load the persisted { notionPageId: googleEventId } map
  let syncState = loadState();

  // --- Step 1: Fetch all current Notion pages ---
  let pages;
  try {
    pages = await fetchNotionPages();
    console.log(`[${timestamp()}] Fetched ${pages.length} pages from Notion`);
  } catch (err) {
    console.error(`[${timestamp()}] Failed to fetch Notion pages:`, err.message);
    // Abort this run — we can't safely sync or detect deletions without the full page list
    return;
  }

  // Build a Set of Notion page IDs that currently exist
  // This is used to detect pages that were deleted since the last sync
  const notionPageIds = new Set(pages.map((p) => p.id));

  // --- Step 2: Detect deleted Notion pages and remove their Google events ---
  // Any key in syncState that is NOT in the current notionPageIds was deleted from Notion
  for (const [notionId, googleEventId] of Object.entries(syncState)) {
    if (!notionPageIds.has(notionId)) {
      try {
        await deleteEvent(googleEventId);
        console.log(
          `[${timestamp()}] Deleted: Google event ${googleEventId} (Notion page was removed)`
        );
        delete syncState[notionId];
        deleted++;
      } catch (err) {
        // Log and continue — one failed deletion should not abort the whole run
        console.error(
          `[${timestamp()}] Failed to delete event ${googleEventId}:`,
          err.message
        );
      }
    }
  }

  // --- Step 3: Create or update Google events for all current Notion pages ---
  for (const page of pages) {
    const eventData = mapNotionToGoogleEvent(page);

    // mapFields returns null when the Timeline property is missing or empty
    if (!eventData) {
      const name = page.properties.Name?.title?.[0]?.plain_text || page.id;
      console.log(`[${timestamp()}] Skipping page "${name}": no date set.`);
      skipped++;
      continue;
    }

    const existingGoogleId = syncState[page.id];

    if (existingGoogleId) {
      // This page was synced before — update the existing Google event
      try {
        await updateEvent(existingGoogleId, eventData);
        console.log(`[${timestamp()}] Updated: "${eventData.summary}"`);
        updated++;
      } catch (err) {
        console.error(
          `[${timestamp()}] Failed to update "${eventData.summary}":`,
          err.message
        );
      }
    } else {
      // New page — create a Google Calendar event and store the ID mapping
      try {
        const newGoogleId = await createEvent(eventData);
        syncState[page.id] = newGoogleId;
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

  // Persist the updated mapping so the next run knows what already exists
  saveState(syncState);

  console.log(
    `[${timestamp()}] Sync complete. Created: ${created}, Updated: ${updated}, Deleted: ${deleted}, Skipped: ${skipped}`
  );
}

module.exports = { runSync };
