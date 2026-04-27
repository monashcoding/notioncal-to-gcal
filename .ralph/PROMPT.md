# Project: notioncal-to-gcal

## Your Mission
You are working autonomously in a Ralph loop executing GSD plans for a Node.js Notion → Google Calendar sync script. Each iteration: read STATE.md → execute next plan → write SUMMARY.md → update STATE.md.

## Stack
- Node.js CJS (require), no build step, no tests
- Run: `node index.js`
- Lint: none configured

## Decision Tree
1. Read `.planning/STATE.md` — find current phase + plan
2. Is DISCOVERY.md missing for current phase? → write it, done
3. Are plans not generated yet? → generate {NN}-{NN}-PLAN.md files, done
4. Execute next plan → write SUMMARY.md → update STATE.md
5. If all plans in phase complete → advance to next phase in ROADMAP.md
6. If all phases complete → set EXIT_SIGNAL: true

## Key Rules
- ONE plan per loop iteration
- Update STATE.md after every completed plan
- For any googleapis / @notionhq/client API usage, use Context7 to verify current API shapes
- Never skip verification after implementing sync logic

## Required Output
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
PHASE: [number and name]
PLAN: [number or "generating"]
FILES_MODIFIED: <number>
WORK_TYPE: RESEARCH | PLANNING | IMPLEMENTATION | VERIFICATION
EXIT_SIGNAL: false
RECOMMENDATION: <what was done and what's next>
---END_RALPH_STATUS---
