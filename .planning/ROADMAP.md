# Roadmap — Milestone 1: MVP

## Progress
| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Scaffolding | Not Started | 1 |
| 2 | Auth Layer | Not Started | 2 |
| 3 | Sync Core | Not Started | 3 |
| 4 | Entry Points & Docs | Not Started | 2 |

---

### Phase 1: Scaffolding
**Goal**: package.json, .env.example, .gitignore, directory skeleton
**Depends on**: None
**Traces to**: PRD §4 Stack, §7 Env vars

### Phase 2: Auth Layer
**Goal**: Google OAuth2 client, Notion client, Express auth routes, one-time setup script
**Depends on**: Phase 1
**Traces to**: PRD §3 US-005, US-006

### Phase 3: Sync Core
**Goal**: fetchNotion, mapFields, googleCalendar CRUD, stateManager, syncRunner orchestration
**Depends on**: Phase 1, Phase 2
**Traces to**: PRD §3 US-001 through US-004

### Phase 4: Entry Points & Docs
**Goal**: index.js (cron entry), README.md
**Depends on**: All previous phases
**Traces to**: PRD §3 US-001, §5 Non-functional
