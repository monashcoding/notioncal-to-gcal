// Shared extraction of the "postable" content of a Notion event, used by every
// social platform module so caption/image logic lives in one place.

function normalizeUrl(u) {
  if (!u) return null;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// The event image: Notion page cover first, then an optional "Image" files
// property. Note: Notion-hosted file URLs are short-lived signed links, so they
// must be handed to the target API immediately (fine for our create-then-publish
// flow). External cover URLs are stable.
function getImageUrl(page) {
  const cover = page.cover;
  if (cover) {
    return cover.type === 'external' ? cover.external?.url : cover.file?.url;
  }
  const file = page.properties?.Image?.files?.[0];
  if (file) return file.type === 'external' ? file.external?.url : file.file?.url;
  return null;
}

function getEventContent(page) {
  const props = page.properties;
  return {
    title: props.Name?.title?.[0]?.plain_text || '(Untitled)',
    caption: props['🔹 Caption']?.rollup?.array?.[0]?.rich_text?.[0]?.plain_text || '',
    dateStart: props.Timeline?.date?.start?.split('T')[0] || null,
    venue: props['Venue']?.rich_text?.[0]?.plain_text || '',
    registrationLink: normalizeUrl(props['🔹 Registration Link']?.rollup?.array?.[0]?.url),
    imageUrl: getImageUrl(page),
  };
}

// The post body text, assembled from the event content.
function buildCaption(content) {
  return [
    content.caption,
    content.dateStart ? `🗓️ ${content.dateStart}` : null,
    content.venue ? `📍 ${content.venue}` : null,
    content.registrationLink ? `Register: ${content.registrationLink}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

module.exports = { getEventContent, buildCaption };
