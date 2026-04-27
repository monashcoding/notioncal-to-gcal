// This is the entry point — the file Node runs when you do `node index.js`.
// You don't need to edit this file.
//
// It does three things:
//   1. Loads your .env file so all environment variables are available
//   2. Checks that tokens.json exists (created by setup-auth.js)
//   3. Runs the sync immediately, then schedules it every 30 minutes

// IMPORTANT: require('dotenv').config() must be the very first line.
// It reads .env and loads all variables into process.env before any other
// module is imported. If any module that runs before this tries to read
// process.env.GOOGLE_CLIENT_ID, it would get undefined.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const cron = require('node-cron'); // third-party package for scheduling recurring tasks
const { setStoredTokens } = require('./auth/google');
const { runSync } = require('./sync/syncRunner');

// Build the full path to tokens.json.
// __dirname is the directory this file lives in (the project root).
const tokensPath = path.join(__dirname, 'tokens.json');

// Pre-flight check: if tokens.json doesn't exist, the Google API won't work.
// process.exit(1) stops the program immediately with an error code.
// The clear error message tells you exactly what to do to fix it.
if (!fs.existsSync(tokensPath)) {
  console.error('tokens.json not found. Please run: node scripts/setup-auth.js');
  process.exit(1);
}

// Read tokens.json from disk and load them onto the OAuth2 client.
// After this, every call in googleCalendar.js is automatically authenticated.
// The googleapis library also handles refreshing the access token when it expires.
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
setStoredTokens(tokens);

// Run the sync immediately when the app starts — don't make it wait 30 minutes.
runSync();

// Schedule the sync to run every 30 minutes using a cron expression.
// Cron expressions have 5 fields: minute, hour, day-of-month, month, day-of-week
//   */30 * * * *  means "every 30 minutes, every hour, every day"
//   The */N syntax means "every N units" — so */30 means every 30 minutes.
// Try it interactively: https://crontab.guru/#*/30_*_*_*_*
cron.schedule('*/30 * * * *', runSync);
