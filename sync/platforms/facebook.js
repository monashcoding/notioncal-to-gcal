// Facebook Page sink (Meta Graph API).
//
// INERT until configured: needs a Meta app with pages_manage_posts (App Review +
// Business Verification for production) and a long-lived Page access token.
// Until FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN exist this module reports
// isConfigured() === false and is never called.

const { getEventContent, buildCaption } = require('./eventContent');

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION || 'v21.0'}`;

const key = 'facebook';
const label = 'Facebook';

function isConfigured() {
  return Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
}

function buildPreview(page) {
  const content = getEventContent(page);
  return {
    title: content.title,
    description: buildCaption(content),
    url: content.registrationLink,
    imageUrl: content.imageUrl,
    footer: 'Facebook — Monash Coding page',
  };
}

async function publish(page) {
  const content = getEventContent(page);
  const message = buildCaption(content);
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;

  // With an image → publish a photo post; otherwise a feed post (optionally with
  // a link that Facebook renders as a link preview).
  let url;
  const body = new URLSearchParams({ access_token: token });

  if (content.imageUrl) {
    url = `${GRAPH}/${pageId}/photos`;
    body.set('url', content.imageUrl);
    body.set('caption', message);
  } else {
    url = `${GRAPH}/${pageId}/feed`;
    body.set('message', message);
    if (content.registrationLink) body.set('link', content.registrationLink);
  }

  const res = await fetch(url, { method: 'POST', body });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Facebook post failed ${res.status}: ${JSON.stringify(data)}`);
  }
  return data.post_id || data.id;
}

module.exports = { key, label, isConfigured, buildPreview, publish };
