# PRD: Notion → Google Calendar Sync

## 1. Overview
A Node.js script that automatically syncs events from a Notion database to an existing Google Calendar on a 30-minute schedule. Notion is the sole source of truth; Google Calendar is a read-only output. Built as a teaching project, so code is clean, well-commented, and structured for easy extension.

## 2. Target Users
| User Type | Description | Primary Need |
|-----------|-------------|--------------|
| Club admin | MAC events team member who manages the Notion calendar | See Notion events appear on Google Calendar automatically |
| Developer (learner) | Node.js student reading this code | Understand OAuth, API integration, and scheduling patterns |

## 3. User Stories

### Epic: Sync
- **US-001**: As an admin, events I add to Notion appear in Google Calendar within 30 minutes.
  - [ ] New Notion page with a Timeline date → Google Calendar event created
  - [ ] Event uses `date` format (all-day), not `dateTime`
- **US-002**: As an admin, when I update a Notion event, Google Calendar reflects the change.
  - [ ] Existing Notion page updated → corresponding Google event patched
- **US-003**: As an admin, when I delete/archive a Notion event, it disappears from Google Calendar.
  - [ ] Page absent from Notion query → Google event deleted, mapping removed
- **US-004**: As an admin, pages with no date set are silently skipped without crashing the sync.
  - [ ] Null/missing Timeline → warning logged, sync continues

### Epic: Auth Setup
- **US-005**: As a developer, I can authorize Google Calendar access once with a browser flow.
  - [ ] `node scripts/setup-auth.js` starts Express server, prints auth URL
  - [ ] Callback saves tokens.json to disk
- **US-006**: As a developer, subsequent sync runs need no browser interaction.
  - [ ] tokens.json loaded on startup; refresh token handles expiry

## 4. Technical Requirements

### Stack
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js (CJS) | Teaching project; CommonJS for clarity |
| Scheduling | node-cron | Simple, no daemon required |
| Notion API | @notionhq/client | Official SDK |
| Google API | googleapis | Official SDK |
| Auth setup | Express | One-time OAuth callback server |
| Config | dotenv | Standard env var loading |

### Data Model
`sync-state.json` — flat `{ notionPageId: googleEventId }` map, stored on disk.

### Notion → Google field mapping
| Notion field | Type | Google field |
|---|---|---|
| Name | title | summary |
| Timeline | date | start.date + end.date |
| Location (future) | rich_text | location |
| Registration link (future) | url | description |
| Caption (future) | rich_text | append to description |

## 5. Non-Functional Requirements
- Single event failure must not crash the sync run
- No database required — flat JSON file for state
- Notion API: 3 req/s limit (not a concern at this scale)
- tokens.json and sync-state.json must never be committed

## 6. MVP Scope
### In Scope
- Name + Timeline sync (all-day events)
- Create / update / delete lifecycle
- 30-minute cron schedule
- One-time OAuth setup script
- Timestamp-prefixed console logging

### Out of Scope (Post-MVP)
- Webhooks
- Two-way sync
- Location, Registration link, Caption fields (stub TODOs in mapFields.js)
- Web UI / dashboard

## 7. Environment Variables
```
NOTION_TOKEN, NOTION_DATABASE_ID, GOOGLE_CLIENT_ID,
GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, GOOGLE_CALENDAR_ID
```
