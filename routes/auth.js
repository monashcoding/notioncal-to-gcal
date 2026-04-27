// This file defines two Express routes used during the one-time OAuth setup.
// You don't need to edit this file — but it uses the same Express patterns
// you learned in Lesson 3, so it's worth reading.
//
// These routes are only active when you run `node scripts/setup-auth.js`.
// The main sync (index.js) does not use them.

const express = require('express');
const fs = require('fs');
const path = require('path');
const { getAuthUrl, getTokensFromCode } = require('../auth/google');

// express.Router() is like a mini Express app — it holds a group of routes
// that get attached to the main app. You could write all routes directly on
// `app`, but Router lets you organise them into separate files.
// This is the same pattern used in larger Express projects.
const router = express.Router();

// Route 1: GET /auth/google
// When setup-auth.js starts, it prints the URL to visit.
// If you visit /auth/google in your browser, it redirects you straight to Google's
// consent screen instead — res.redirect() sends a 302 response with a Location header.
router.get('/auth/google', (req, res) => {
  res.redirect(getAuthUrl());
});

// Route 2: GET /auth/callback
// After you grant permission on Google's page, Google redirects your browser to:
//   http://localhost:3000/auth/callback?code=SOME_LONG_CODE
//
// This route handles that redirect. It:
//   1. Reads the `code` from the query string (req.query — same as Lesson 3)
//   2. Exchanges the code for real tokens by calling Google's API
//   3. Saves those tokens to tokens.json on disk
//   4. Tells you to stop this server and run node index.js
router.get('/auth/callback', async (req, res) => {
  // req.query contains everything after the ? in the URL.
  // Here we're pulling out just the `code` field using destructuring —
  // { code } = req.query is the same as: const code = req.query.code;
  const { code } = req.query;

  // If there's no code, something went wrong with the OAuth flow
  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    // Exchange the one-time code for access + refresh tokens.
    // This is an async API call — we await it before continuing.
    const tokens = await getTokensFromCode(code);

    // Write the tokens to tokens.json so index.js can load them on every future run.
    // JSON.stringify(tokens, null, 2) formats the JSON with 2-space indentation —
    // the same as JSON.stringify you used in Lesson 4.
    // IMPORTANT: tokens.json is gitignored — never commit it, it contains your Google credentials.
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

    console.log('\nTokens saved to tokens.json');
    console.log('Auth complete. Stop this server (Ctrl+C) and run: node index.js');

    // Send a plain text response back to the browser
    res.send('Auth complete. You can close this tab.');
  } catch (err) {
    // If anything goes wrong, log it and send a 500 error response.
    // This is the same error handling pattern from Lesson 3.
    console.error('Error exchanging code for tokens:', err.message);
    res.status(500).send('Auth failed. Check the console for details.');
  }
});

module.exports = router;
