/**
 * One-time Google OAuth setup script.
 *
 * Run this ONCE before starting the sync:
 *   node scripts/setup-auth.js
 *
 * What it does:
 *   1. Starts a local Express server at http://localhost:3000
 *   2. Prints a Google auth URL — open it in your browser
 *   3. Google redirects back to /auth/callback after you grant permission
 *   4. tokens.json is saved to the project root
 *   5. Stop this server (Ctrl+C) and run `node index.js` to start syncing
 */

// dotenv must be loaded before any other module that reads env vars
require('dotenv').config();

const express = require('express');
const authRouter = require('../routes/auth');

const app = express();
app.use(authRouter);

const PORT = 3000;

app.listen(PORT, () => {
  // Import here (after dotenv) so env vars are available when auth/google.js initialises
  const { getAuthUrl } = require('../auth/google');

  console.log('\n=== Google Calendar OAuth Setup ===\n');
  console.log('Open this URL in your browser:\n');
  console.log(getAuthUrl());
  console.log('\nWaiting for you to authorize...');
  console.log('(This server will keep running until you stop it with Ctrl+C)\n');
});
