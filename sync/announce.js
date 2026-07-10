// The "announce-once, human-confirmed" framework shared by every social sink
// (LinkedIn, Facebook, Instagram).
//
// Unlike the mirror sinks (Google Calendar, Discord events), a social post must
// NOT be re-sent every run. It fires exactly once, and only after a human
// approves it — implemented purely by polling, so no websocket/gateway is
// needed:
//
//   1. First time a page qualifies → post a PREVIEW of the post to a private
//      Discord channel and add a ✅ reaction (as the bot). State → awaiting_confirm.
//   2. Each later run → read that message's ✅ reactions. If a *human* (any user
//      other than the bot) reacted → publish for real. State → posted.
//   3. posted → never touched again.
//
// A platform is only ever touched when it is fully configured (its own env vars
// AND the Discord confirm channel). Otherwise the sink is inert — no preview, no
// publish, no crash.

const { isConfigured: discordConfigured, discordRequest } = require('../auth/discord');

const CHECK = '✅';
const CHECK_ENCODED = encodeURIComponent(CHECK);

function confirmChannelId() {
  return process.env.DISCORD_CONFIRM_CHANNEL_ID;
}

// The confirm flow needs Discord itself configured plus a channel to post into.
function canConfirm() {
  return discordConfigured() && Boolean(confirmChannelId());
}

// Post a preview message + embed to the confirm channel and pre-add the ✅ so a
// human only has to click it. Returns the created message id.
async function postPreview(platform, preview) {
  const channel = confirmChannelId();

  const embed = { title: preview.title };
  if (preview.description) embed.description = preview.description.slice(0, 4000);
  if (preview.url) embed.url = preview.url;
  if (preview.imageUrl) embed.image = { url: preview.imageUrl };
  if (preview.footer) embed.footer = { text: preview.footer };

  const message = await discordRequest('POST', `/channels/${channel}/messages`, {
    content: `React ${CHECK} to publish this to **${platform.label}**.`,
    embeds: [embed],
  });

  // Pre-add the bot's own ✅; humans click the same reaction to approve.
  await discordRequest(
    'PUT',
    `/channels/${channel}/messages/${message.id}/reactions/${CHECK_ENCODED}/@me`
  );

  return message.id;
}

// Has a human (any user other than the bot) reacted with ✅ on the preview?
async function isConfirmed(channelId, messageId) {
  const users = await discordRequest(
    'GET',
    `/channels/${channelId}/messages/${messageId}/reactions/${CHECK_ENCODED}`
  );
  const botId = process.env.DISCORD_BOT_USER_ID;
  return Array.isArray(users) && users.some((u) => u.id !== botId);
}

// Drive one platform's state machine for one page. Mutates pageState in place
// (the caller persists it). Returns a short result object for logging/counters.
async function announceOnce(page, platform, pageState) {
  if (!platform.isConfigured() || !canConfirm()) {
    return { action: 'inactive' };
  }

  const existing = pageState[platform.key];

  // Already published — leave it alone forever.
  if (existing?.stage === 'posted') return { action: 'posted' };

  // A previous attempt hard-failed. Don't retry automatically (re-tick / manual).
  if (existing?.stage === 'failed') return { action: 'failed-earlier' };

  // First encounter: stage a preview for human approval.
  if (!existing) {
    const preview = platform.buildPreview(page);
    if (!preview) return { action: 'skipped' }; // not enough data to post
    const messageId = await postPreview(platform, preview);
    pageState[platform.key] = {
      stage: 'awaiting_confirm',
      confirmChannelId: confirmChannelId(),
      confirmMessageId: messageId,
    };
    return { action: 'staged' };
  }

  // Awaiting the human ✅.
  if (existing.stage === 'awaiting_confirm') {
    const confirmed = await isConfirmed(existing.confirmChannelId, existing.confirmMessageId);
    if (!confirmed) return { action: 'waiting' };

    try {
      const remoteId = await platform.publish(page);
      existing.stage = 'posted';
      existing.remoteId = remoteId;
      existing.postedAt = new Date().toISOString();
      return { action: 'published' };
    } catch (err) {
      existing.stage = 'failed';
      existing.error = err.message;
      return { action: 'failed', error: err.message };
    }
  }

  return { action: 'noop' };
}

module.exports = { announceOnce, canConfirm };
