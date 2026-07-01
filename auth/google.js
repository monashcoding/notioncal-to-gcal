// This file sets up the Google OAuth2 client and exports helper functions.
// You don't need to edit this file.
//
// -----------------------------------------------------------------------------
// WHAT IS OAUTH?
// -----------------------------------------------------------------------------
// OAuth is how apps get permission to access your Google account without you
// giving them your password. You've seen it before — "Sign in with Google" buttons
// use OAuth. Here's the flow:
//
//   1. We send the user to a Google URL (the "auth URL")
//   2. Google asks "do you allow this app to access your calendar?"
//   3. The user clicks Allow
//   4. Google redirects back to our app with a one-time `code`
//   5. We exchange that code for tokens (access token + refresh token)
//   6. We save those tokens to tokens.json and use them for all future API calls
//
// The access token expires after ~1 hour. The refresh token never expires and
// is used to get a new access token automatically. That's why we save both.
//
// -----------------------------------------------------------------------------
// HOW THIS CONNECTS TO THE REST OF THE APP
// -----------------------------------------------------------------------------
// scripts/setup-auth.js  → runs the one-time OAuth flow, saves tokens.json
// index.js               → loads tokens.json and calls setStoredTokens()
// sync/googleCalendar.js → uses oauth2Client (already authenticated) to make API calls

const { google } = require('googleapis');

// oauth2Client is the core object that handles authentication for us.
// We pass it the three credentials from .env — Google uses these to identify our app.
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,     // identifies our app to Google
  process.env.GOOGLE_CLIENT_SECRET, // proves we are who we say we are
  process.env.GOOGLE_REDIRECT_URI   // where Google sends the user after they approve
);

// Builds the URL we send the user to so they can grant calendar access.
// access_type: 'offline' tells Google to include a refresh token in the response.
// Without it, the token expires after 1 hour and the sync silently breaks.
// scope tells Google exactly what permissions we're requesting — nothing more.
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

// Called once during setup: exchanges the one-time code Google gives us
// for a real access token + refresh token we can store and reuse.
async function getTokensFromCode(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Called on every startup (from index.js): loads the saved tokens from tokens.json
// onto the client so every subsequent API call is authenticated.
// After this, the googleapis library handles token refreshes automatically.
function setStoredTokens(tokens) {
  oauth2Client.setCredentials(tokens);
}

// We export oauth2Client so googleCalendar.js can attach it to the Calendar API.
// We export the three functions so setup-auth.js and index.js can use them.
module.exports = { oauth2Client, getAuthUrl, getTokensFromCode, setStoredTokens };
