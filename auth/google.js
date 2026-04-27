const { google } = require('googleapis');

// Create an OAuth2 client using credentials from .env
// This client is reused across auth setup and every sync run
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate the URL the user must visit once to grant calendar access
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    // access_type: 'offline' is critical — without it, Google returns only an access token
    // (valid for 1 hour) and never returns a refresh token. The sync would silently break
    // after the first hour. With 'offline', we get a refresh token that never expires.
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

// Exchange the one-time code (from the OAuth callback URL) for access + refresh tokens
async function getTokensFromCode(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Load tokens from disk onto the client so API calls are authenticated
// The googleapis library automatically uses the refresh token to renew the access token
function setStoredTokens(tokens) {
  oauth2Client.setCredentials(tokens);
}

module.exports = { oauth2Client, getAuthUrl, getTokensFromCode, setStoredTokens };
