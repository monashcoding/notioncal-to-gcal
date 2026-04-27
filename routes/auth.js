const express = require('express');
const fs = require('fs');
const path = require('path');
const { getAuthUrl, getTokensFromCode } = require('../auth/google');

const router = express.Router();

// Redirect the user to Google's OAuth consent screen
router.get('/auth/google', (req, res) => {
  res.redirect(getAuthUrl());
});

// Google redirects back here after the user grants permission
// The URL will contain ?code=... which we exchange for tokens
router.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code.');
  }

  try {
    const tokens = await getTokensFromCode(code);

    // Persist tokens to disk so the main sync script can load them on every run.
    // This file must NEVER be committed to git — it contains your Google refresh token.
    const tokensPath = path.join(__dirname, '..', 'tokens.json');
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

    console.log('\nTokens saved to tokens.json');
    console.log('Auth complete. Stop this server (Ctrl+C) and run: node index.js');

    res.send('Auth complete. You can close this tab.');
  } catch (err) {
    console.error('Error exchanging code for tokens:', err.message);
    res.status(500).send('Auth failed. Check the console for details.');
  }
});

module.exports = router;
