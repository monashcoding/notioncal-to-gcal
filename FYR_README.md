# Notion → Google Calendar Sync

Welcome! This project automatically syncs events from a Notion database to a Google Calendar, running every 30 minutes.

Most of the hard stuff is already built. Your job is to implement three files that do the actual data work. If you've completed the To-Do API ticket, you already know everything you need — this project uses the same patterns, just talking to external APIs instead of an in-memory array.

---

## What the project does

```
Notion database  →  fetch pages  →  transform data  →  Google Calendar
```

1. Every 30 minutes, fetch events from a Notion database
2. Transform each Notion page into a Google Calendar event object
3. Create, update, or delete Google Calendar events to match Notion

---

## Concepts to understand before starting

Read this before touching any code.

**`require()` and `module.exports`**
You've used these already. Each file exports functions, and other files import them with `require()`. Same pattern throughout this project.

**`async` / `await`**
In Lesson 1 you saw the callback style for async operations:
```js
fs.readFile('file.txt', function(err, data) { ... })
```
`async/await` is the modern way to write the same thing — cleaner and easier to read:
```js
const data = await fs.promises.readFile('file.txt');
```
Any function that calls an external API (Notion, Google) needs to be `async` and use `await`. You'll use this in Tasks 1 and 3.

**Environment variables**
`process.env.NOTION_TOKEN` reads a value from your `.env` file. The `require('dotenv').config()` at the top of `index.js` loads `.env` into `process.env` before anything else runs. This is how the app accesses secrets without hardcoding them.

**`sync-state.json`**
A file that maps `{ notionPageId: googleEventId }` — it's how the app remembers which Notion pages have already been synced, so it doesn't create duplicates on the next run. In Lesson 4 you learned that in-memory arrays are lost when the server restarts — this file solves that problem. Read `sync/stateManager.js` — it's only 20 lines and worth understanding.

---

## Setup (do this first)

**1. Install dependencies**
```bash
npm install
```
This reads `package.json` and installs everything — same as you've done before.

**2. Create your `.env` file**
```bash
cp .env.example .env
```
Then fill in the values — ask your lead for the credentials. The `.env` file stores secrets that shouldn't be hardcoded in your code (API keys, passwords, etc.).

**3. Authorise Google Calendar (one-time)**
```bash
node scripts/setup-auth.js
```
Open the URL it prints, sign in with the calendar account, and grant permission. This saves a `tokens.json` file — don't commit this file.

**4. Verify the app starts**
```bash
node index.js
```
You should see `Sync started` in the terminal. It will fail shortly after — that's expected. You haven't implemented anything yet. Move on to the tasks.

---

## Your tasks

Work through these three files **in order**. Each file has `TODO` comments with hints and links to docs. Run the checkpoint after each task before moving on.

---

### Task 1 — `sync/fetchNotion.js`

Fetch pages from Notion with filters applied — similar to filtering an array in your To-Do API, but telling the API to filter server-side.

You need to:
- Calculate the cutoff date (January 1st of the current year)
- Add a filter so only `Event` and `Social` types from this year are returned

**Docs:**
- [Notion filter syntax](https://developers.notion.com/reference/post-database-query-filter)
- [async/await explained](https://javascript.info/async-await)

**Checkpoint — run this and verify:**
```bash
node index.js
```
You should see:
```
[2026-05-01 10:00:00] Sync started
[2026-05-01 10:00:01] Fetched 45 pages from Notion
```
If the number is `0`, your filter is too strict — check the Type values and date. If it crashes before "Fetched", re-read the error message and check your syntax.

---

### Task 2 — `sync/mapFields.js`

Transform a raw Notion page into a Google Calendar event object — the same idea as transforming data in your To-Do API.

**Start here:** add `console.log(JSON.stringify(page.properties, null, 2))` at the top of the function and run `node index.js`. Read the output — you need to understand the shape of the data before you can work with it.

You need to:
- Extract the event title from the `Name` property
- Extract the start date from the `Timeline` property
- Return `null` if there's no date (so the event gets skipped)
- Build and return the Google Calendar event object

**Docs:**
- [Notion property value objects](https://developers.notion.com/reference/property-value-object)
- [Google Calendar event format](https://developers.google.com/calendar/api/v3/reference/events#resource)
- [Optional chaining (`?.`)](https://javascript.info/optional-chaining)

**Checkpoint — run this and verify:**
```bash
node index.js
```
You should see event names being logged, then errors like `Failed to create "Trivia Night"`. That's correct — it means your field mapping is working and passing data to Task 3, which isn't implemented yet. If you still see no event names, your function isn't returning the object correctly.

---

### Task 3 — `sync/googleCalendar.js`

Call the Google Calendar API to create, update, and delete events — the same CRUD operations you implemented in your To-Do API, but on Google's servers instead of a local array.

You need to implement:
- `createEvent(eventData)` — insert a new event, return its ID
- `updateEvent(googleEventId, eventData)` — patch an existing event
- `deleteEvent(googleEventId)` — delete an event

**Docs:**
- [events.insert](https://developers.google.com/calendar/api/v3/reference/events/insert)
- [events.patch](https://developers.google.com/calendar/api/v3/reference/events/patch)
- [events.delete](https://developers.google.com/calendar/api/v3/reference/events/delete)

**Checkpoint — run this and verify:**
```bash
node index.js
```
A fully working run looks like:
```
[2026-05-01 10:00:00] Sync started
[2026-05-01 10:00:01] Fetched 45 pages from Notion
[2026-05-01 10:00:02] Created: "Trivia Night"
[2026-05-01 10:00:02] Created: "Sports Day"
...
[2026-05-01 10:00:05] Sync complete. Created: 45, Updated: 0, Deleted: 0, Skipped: 2
```
Then open Google Calendar — all the events should be there. Run `node index.js` a second time and verify the summary shows `Updated` instead of `Created` (no duplicates).

---

## Debugging tips

- Read the error message — Node.js tells you the file and line number
- Use `console.log()` liberally to inspect values (you did this in Lesson 5)
- If you're unsure what shape data is in, log it with `JSON.stringify(data, null, 2)`

---

## File map

```
index.js                  ← Entry point. Loads tokens, starts cron. Already done.
scripts/setup-auth.js     ← One-time OAuth setup. Already done.
auth/google.js            ← Google OAuth client. Already done.
auth/notion.js            ← Notion client. Already done.
sync/stateManager.js      ← Saves/loads sync-state.json. Already done — worth reading.
sync/syncRunner.js        ← Orchestrates the whole sync. Already done — read this carefully.

sync/fetchNotion.js       ← TASK 1: Fetch and filter Notion pages
sync/mapFields.js         ← TASK 2: Transform Notion page → Google Calendar event
sync/googleCalendar.js    ← TASK 3: Create / update / delete Google Calendar events
```
