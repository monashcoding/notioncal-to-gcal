// require('dotenv').config() MUST be the very first line of this file.
// It reads the .env file and loads all variables into process.env BEFORE
// any other module is imported. If this line comes after a require() that
// reads env vars (e.g. auth/google.js), those modules will see undefined values.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { setStoredTokens } = require('./auth/google');
const { runSync } = require('./sync/syncRunner');

// --- Pre-flight check: tokens.json must exist ---
// tokens.json is created by running `node scripts/setup-auth.js` once.
// Without it, the Google Calendar API cannot authenticate.
const tokensPath = path.join(__dirname, 'tokens.json');

if (!fs.existsSync(tokensPath)) {
  console.error('tokens.json not found. Please run: node scripts/setup-auth.js');
  process.exit(1);
}

// Load the saved Google OAuth tokens and attach them to the OAuth2 client.
// The googleapis library will automatically use the refresh token to renew the
// access token whenever it expires (roughly every hour).
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
setStoredTokens(tokens);

// --- Run immediately on startup ---
// Don't make the user wait 30 minutes for the first sync
runSync();

// --- Schedule subsequent runs every 30 minutes ---
// Cron expression breakdown: */30 * * * *
//   */30  — every 30 minutes (the */N syntax means "every N units")
//   *     — every hour
//   *     — every day of month
//   *     — every month
//   *     — every day of week
// Full reference: https://crontab.guru/#*/30_*_*_*_*
cron.schedule('*/30 * * * *', runSync);
