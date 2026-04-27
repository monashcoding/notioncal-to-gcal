/**
 * One-time Google OAuth setup script.
 * You don't need to edit this file.
 *
 * Run this ONCE before starting the sync:
 *   node scripts/setup-auth.js
 *
 * What happens when you run it:
 *   1. A temporary Express server starts at http://localhost:3000
 *   2. A Google auth URL is printed in your terminal — open it in your browser
 *   3. Google asks you to grant calendar access — click Allow
 *   4. Google redirects your browser to /auth/callback (handled in routes/auth.js)
 *   5. tokens.json is saved to the project root automatically
 *   6. Stop this server with Ctrl+C, then run `node index.js` to start syncing
 *
 * After this you never need to run it again unless you delete tokens.json.
 */

// dotenv must be the very first thing loaded so env vars are available
// before any other module reads from process.env
require('dotenv').config();

const express = require('express');
const authRouter = require('../routes/auth');

// This is the same Express setup you've done before —
// create the app, attach the router that handles /auth/google and /auth/callback
const app = express();
app.use(authRouter);

const PORT = 3000;

// Start the server, then print the auth URL once it's listening.
// getAuthUrl() is imported inside the callback (after dotenv runs) to make sure
// env vars are loaded before auth/google.js tries to read them.
app.listen(PORT, () => {
  const { getAuthUrl } = require('../auth/google');

  console.log('\n=== Google Calendar OAuth Setup ===\n');
  console.log('Open this URL in your browser:\n');
  console.log(getAuthUrl());
  console.log('\nWaiting for you to authorize...');
  console.log('(This server will keep running until you stop it with Ctrl+C)\n');
});
