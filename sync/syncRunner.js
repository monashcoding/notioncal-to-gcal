/**
 * Core orchestration: fetch Notion pages, then fan each one out to every
 * destination.
 *
 * Two kinds of destination:
 *   - MIRROR sinks (Google Calendar, Discord scheduled events): kept exactly in
 *     sync with Notion every run — created, updated, and deleted to match.
 *   - ANNOUNCE-ONCE sinks (LinkedIn, Facebook, Instagram): fire once, only after
 *     a human ✅-confirms in Discord, and only when that platform is configured.
 *
 * Everything except the Google Calendar mirror is gated by the Notion `Announce`
 * checkbox. Social sinks whose credentials are absent are completely inert.
 */

const { fetchNotionPages } = require('./fetchNotion');
const { mapNotionToGoogleEvent } = require('./mapFields');
const { createEvent, updateEvent, deleteEvent } = require('./googleCalendar');
const { mapNotionToDiscordEvent } = require('./mapDiscord');
const {
  createScheduledEvent,
  updateScheduledEvent,
  deleteScheduledEvent,
} = require('./discordEvents');
const { isConfigured: discordConfigured } = require('../auth/discord');
const { announceOnce } = require('./announce');
const { loadState, saveState } = require('./stateManager');

// The announce-once social platforms. Adding another is one file + one entry here.
const SOCIAL_PLATFORMS = [
  require('./platforms/linkedin'),
  require('./platforms/facebook'),
  require('./platforms/instagram'),
];

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function isAnnounced(page) {
  return page.properties?.Announce?.checkbox === true;
}

async function runSync() {
  console.log(`[${timestamp()}] Sync started`);

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let skipped = 0;
  // Discord scheduled-event mirror counters.
  let dCreated = 0;
  let dUpdated = 0;
  let dDeleted = 0;
  // Social announce-once counters (staged for approval / published / waiting on ✅).
  let staged = 0;
  let published = 0;

  const syncState = loadState();

  // --- Step 1: Fetch all current Notion pages ---
  let pages;
  try {
    pages = await fetchNotionPages();
    console.log(`[${timestamp()}] Fetched ${pages.length} pages from Notion`);
  } catch (err) {
    console.error(`[${timestamp()}] Failed to fetch Notion pages:`, err.message);
    return;
  }

  const notionPageIds = new Set(pages.map((p) => p.id));
  const discordOn = discordConfigured();

  // --- Step 2: Handle Notion pages that were deleted — remove mirror events ---
  for (const [notionId, pageState] of Object.entries(syncState)) {
    if (notionPageIds.has(notionId)) continue;

    if (pageState.google) {
      try {
        await deleteEvent(pageState.google);
        console.log(`[${timestamp()}] Deleted Google event (Notion page removed)`);
        deleted++;
      } catch (err) {
        console.error(`[${timestamp()}] Failed to delete Google event:`, err.message);
      }
    }
    if (pageState.discord && discordOn) {
      try {
        await deleteScheduledEvent(pageState.discord);
        console.log(`[${timestamp()}] Cancelled Discord event (Notion page removed)`);
        dDeleted++;
      } catch (err) {
        console.error(`[${timestamp()}] Failed to cancel Discord event:`, err.message);
      }
    }
    delete syncState[notionId];
  }

  // --- Step 3: Create/update/announce for every current Notion page ---
  for (const page of pages) {
    const pageState = syncState[page.id] || (syncState[page.id] = {});

    // 3a. Google Calendar mirror (always, not gated by Announce).
    const eventData = mapNotionToGoogleEvent(page);
    if (!eventData) {
      const name = page.properties.Name?.title?.[0]?.plain_text || page.id;
      console.log(`[${timestamp()}] Skipping page "${name}": no date set.`);
      skipped++;
    } else if (pageState.google) {
      try {
        const liveId = await updateEvent(pageState.google, eventData);
        if (liveId !== pageState.google) {
          pageState.google = liveId;
          console.log(`[${timestamp()}] Recreated (was deleted in Google): "${eventData.summary}"`);
        } else {
          console.log(`[${timestamp()}] Updated: "${eventData.summary}"`);
        }
        updated++;
      } catch (err) {
        console.error(`[${timestamp()}] Failed to update "${eventData.summary}":`, err.message);
      }
    } else {
      try {
        pageState.google = await createEvent(eventData);
        console.log(`[${timestamp()}] Created: "${eventData.summary}"`);
        created++;
      } catch (err) {
        console.error(`[${timestamp()}] Failed to create "${eventData.summary}":`, err.message);
      }
    }

    const announced = isAnnounced(page);
    const title = page.properties.Name?.title?.[0]?.plain_text || page.id;

    // 3b. Discord scheduled-event mirror — gated by Announce, only if configured.
    if (discordOn) {
      if (announced) {
        const discordPayload = mapNotionToDiscordEvent(page);
        if (discordPayload) {
          try {
            if (pageState.discord) {
              const liveId = await updateScheduledEvent(pageState.discord, discordPayload);
              if (liveId !== pageState.discord) pageState.discord = liveId;
              console.log(`[${timestamp()}] Discord event updated: "${title}"`);
              dUpdated++;
            } else {
              pageState.discord = await createScheduledEvent(discordPayload);
              console.log(`[${timestamp()}] Discord event created: "${title}"`);
              dCreated++;
            }
          } catch (err) {
            console.error(`[${timestamp()}] Discord event failed for "${title}":`, err.message);
          }
        }
      } else if (pageState.discord) {
        // Announce was unticked → cancel the Discord event.
        try {
          await deleteScheduledEvent(pageState.discord);
          delete pageState.discord;
          console.log(`[${timestamp()}] Discord event cancelled (Announce unticked): "${title}"`);
          dDeleted++;
        } catch (err) {
          console.error(`[${timestamp()}] Failed to cancel Discord event for "${title}":`, err.message);
        }
      }
    }

    // 3c. Social announce-once sinks — gated by Announce; inert if unconfigured.
    if (announced) {
      for (const platform of SOCIAL_PLATFORMS) {
        try {
          const result = await announceOnce(page, platform, pageState);
          if (result.action === 'staged') {
            console.log(`[${timestamp()}] ${platform.label} preview staged for approval: "${title}"`);
            staged++;
          } else if (result.action === 'published') {
            console.log(`[${timestamp()}] ${platform.label} published: "${title}"`);
            published++;
          } else if (result.action === 'failed') {
            console.error(`[${timestamp()}] ${platform.label} publish failed for "${title}": ${result.error}`);
          }
        } catch (err) {
          // A social sink must never abort the run.
          console.error(`[${timestamp()}] ${platform.label} error for "${title}":`, err.message);
        }
      }
    }
  }

  saveState(syncState);

  console.log(
    `[${timestamp()}] Sync complete. Created: ${created}, Updated: ${updated}, Deleted: ${deleted}, Skipped: ${skipped}` +
      ` | Discord +${dCreated}/~${dUpdated}/-${dDeleted}` +
      ` | Social staged: ${staged}, published: ${published}`
  );
}

module.exports = { runSync };
