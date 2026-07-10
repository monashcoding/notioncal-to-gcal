// Instagram feed sink (Meta Graph API content publishing).
//
// INERT until configured: needs a Business/Creator account linked to the FB Page,
// Meta App Review + Business Verification, and instagram_content_publish. Reuses
// the same Page access token as Facebook. Requires IG_USER_ID + FB_PAGE_ACCESS_TOKEN.
//
// Instagram has NO text-only posts — an image is mandatory, and it must be a
// PUBLIC URL that Instagram can fetch. Events without an image are skipped
// (buildPreview returns null).

const { getEventContent, buildCaption } = require('./eventContent');

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}`;

const key = 'instagram';
const label = 'Instagram';

function isConfigured() {
  return Boolean(process.env.IG_USER_ID && process.env.FB_PAGE_ACCESS_TOKEN);
}

// No image → nothing Instagram can post, so signal "skip".
function buildPreview(page) {
  const content = getEventContent(page);
  if (!content.imageUrl) return null;
  return {
    title: content.title,
    description: buildCaption(content),
    url: content.registrationLink,
    imageUrl: content.imageUrl,
    footer: 'Instagram — image required',
  };
}

async function publish(page) {
  const content = getEventContent(page);
  if (!content.imageUrl) throw new Error('Instagram requires an image, none found');

  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const igId = process.env.IG_USER_ID;
  const caption = buildCaption(content);

  // Step 1: create a media container.
  const createBody = new URLSearchParams({
    image_url: content.imageUrl,
    caption,
    access_token: token,
  });
  const createRes = await fetch(`${GRAPH}/${igId}/media`, { method: 'POST', body: createBody });
  const created = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Instagram container failed ${createRes.status}: ${JSON.stringify(created)}`);
  }

  // Step 2: publish the container.
  const publishBody = new URLSearchParams({ creation_id: created.id, access_token: token });
  const pubRes = await fetch(`${GRAPH}/${igId}/media_publish`, { method: 'POST', body: publishBody });
  const published = await pubRes.json();
  if (!pubRes.ok) {
    throw new Error(`Instagram publish failed ${pubRes.status}: ${JSON.stringify(published)}`);
  }
  return published.id;
}

module.exports = { key, label, isConfigured, buildPreview, publish };
