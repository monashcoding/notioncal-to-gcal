require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');
const { oauth2Client, setStoredTokens } = require('../auth/google');

async function clearCalendar() {
  const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
  setStoredTokens(tokens);

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  let pageToken = undefined;
  let totalDeleted = 0;

  do {
    const res = await calendar.events.list({
      calendarId,
      maxResults: 250,
      pageToken,
      singleEvents: true,
    });

    const events = res.data.items || [];

    for (const event of events) {
      await calendar.events.delete({ calendarId, eventId: event.id });
      console.log(`Deleted: "${event.summary}"`);
      totalDeleted++;
    }

    pageToken = res.data.nextPageToken;
  } while (pageToken);

  console.log(`\nDone. ${totalDeleted} events deleted.`);

  // Reset sync state so the next run recreates everything
  fs.writeFileSync('sync-state.json', '{}');
  console.log('sync-state.json reset.');
}

clearCalendar().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
