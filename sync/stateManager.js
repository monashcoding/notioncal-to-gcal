// This file handles saving and loading sync-state.json.
// You don't need to edit this file.
//
// -----------------------------------------------------------------------------
// WHAT IS sync-state.json?
// -----------------------------------------------------------------------------
// Every time an event is created in Google Calendar, we save a record of it:
//   { "notionPageId": "googleEventId" }
//
// On the next sync run, we check this file to see if a Notion page has already
// been synced. If it has, we UPDATE the existing Google event. If it hasn't,
// we CREATE a new one. Without this file, every sync would create duplicates.
//
// Think of it as the app's memory between runs — since Node.js doesn't keep
// variables in memory after it stops (same as the in-memory array limitation
// you learned about in Lesson 4), we persist state to a file instead.
//
// The file looks like this:
//   {
//     "abc123": "google_event_id_1",
//     "def456": "google_event_id_2"
//   }

const fs = require('fs');
const path = require('path');

// Build the full path to sync-state.json at the project root.
// __dirname is the directory this file lives in (sync/).
// path.join(__dirname, '..', 'sync-state.json') goes one level up to the root.
// Using path.join (instead of a hardcoded string) works on both Mac and Windows.
// DATA_DIR lets deployments (e.g. Docker/Dokploy) point persistent files at a
// mounted volume. Defaults to the project root so local dev is unchanged.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const STATE_FILE = path.join(DATA_DIR, 'sync-state.json');

// Load the saved state from disk.
// fs.existsSync checks if the file exists — on the very first run it won't,
// so we return an empty object {} instead of crashing.
// fs.readFileSync reads the file as a string, then JSON.parse converts it
// back into a JavaScript object (the reverse of JSON.stringify from Lesson 4).
function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

// Save the current state to disk, overwriting the previous version.
// JSON.stringify(state, null, 2) converts the object to a formatted JSON string
// with 2-space indentation — you can open sync-state.json and read it easily.
// fs.writeFileSync writes it to disk synchronously (it waits until done).
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

module.exports = { loadState, saveState };
