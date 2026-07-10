// LinkedIn company-page sink.
//
// INERT until configured: posting to an organization page needs LinkedIn's
// Community Management API (partner approval + w_organization_social + page
// admin). Until LINKEDIN_ACCESS_TOKEN and LINKEDIN_ORG_ID exist this module
// reports isConfigured() === false and is never called.
//
// Text-only for now (the registration link is included in the commentary).
// Image attachments require a separate asset-upload dance and can be added later.

const { getEventContent, buildCaption } = require('./eventContent');

const key = 'linkedin';
const label = 'LinkedIn';

function isConfigured() {
  return Boolean(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_ORG_ID);
}

function buildPreview(page) {
  const content = getEventContent(page);
  return {
    title: content.title,
    description: buildCaption(content),
    url: content.registrationLink,
    imageUrl: content.imageUrl,
    footer: 'LinkedIn — Monash Coding page',
  };
}

async function publish(page) {
  const content = getEventContent(page);
  const commentary = buildCaption(content);

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202405',
    },
    body: JSON.stringify({
      author: `urn:li:organization:${process.env.LINKEDIN_ORG_ID}`,
      commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn post failed ${res.status}: ${text}`);
  }

  // LinkedIn returns the new post URN in the x-restli-id / x-linkedin-id header.
  return res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || 'posted';
}

module.exports = { key, label, isConfigured, buildPreview, publish };
