const fs = require('fs');
const path = require('path');

// sync-state.json lives at the project root
// Structure: { "notionPageId": "googleEventId", ... }
const STATE_FILE = path.join(__dirname, '..', 'sync-state.json');

// Load the ID mapping from disk. Returns {} if the file doesn't exist yet
// (i.e. on the very first sync run).
function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

// Overwrite sync-state.json with the current mapping
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

module.exports = { loadState, saveState };
