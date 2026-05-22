# Mission Control Live / Static Data Audit

Scope:
- Frontend UI host: `https://mission-control-livid-zeta.vercel.app`
- Backend API host: `https://mc-api.sentinelstechnologygroup.com`
- Local browser shell: `http://127.0.0.1:5173`
- Local API: `http://127.0.0.1:4174`
- Cloudflare Access vars were verified present without printing secrets
- No Aurora terminology used

## Architecture summary

Mission Control is a split deployment:
- Vercel serves the frontend UI shell and SPA routes.
- `mc-api.sentinelstechnologygroup.com` serves backend/API truth.
- Vercel `/api/*` fallthrough is expected frontend-only behavior and is not a blocker in this architecture.

## Frontend host status

The frontend host now returns HTML as expected for UI routes, and the department floor productization is live on the public deployment.

Observed on `https://mission-control-livid-zeta.vercel.app`:
- routes return HTML
- `/departments` and the department floor routes render the new office model
- department pages show floor-state sections, handoff lines, evidence drawers, blocked/completed panels, and n8n-style workflow travel placeholders
- the top-level home shell remains an older operational shell, but that is separate from the department-floor objective

That means the production frontend build has caught up to the targeted department-floor work, and the split deployment is functioning normally.

## Backend API host status

The backend host is now reachable and returning JSON for the runtime truth routes.

Observed on `https://mc-api.sentinelstechnologygroup.com`:
- `/api/health` → 200 JSON
- `/api/runtime` → 200 JSON
- `/api/runtime/healthz` → 200 JSON
- `/api/departments/workflows` → 200 JSON
- additional API truth routes are also returning JSON when checked

## Local truth remains green

Locally, the Mission Control UI/API stack remains truthful:
- department overview is live
- office surfaces are live/truthful with honest empty states
- `/api/runtime` and `/api/runtime/healthz` return JSON locally
- department floors now expose desk state transitions, conference room state, break room state, handoff lines, and evidence drawer records
- department offices continue to use source labels rather than fake activity

## What loads live locally

- `/`
- `/departments`
- `/departments/command`
- `/departments/technology`
- `/departments/media`
- `/departments/security`
- `/departments/finance`
- `/departments/opportunity`
- `/departments/research`
- `/departments/admin`
- `/agents`
- `/missions`
- `/approvals`
- `/calendar`
- `/knowledge`
- `/security`
- `/runtime`
- `/system`
- `/costs`

## What is source-labeled rather than fake

- `/missions` is a live work queue surface with live / registry-backed source labels.
- `/approvals` is an executive review and QA/security gate inbox with live / registry-backed / seeded labels.
- `/calendar` is an operational schedule/checkpoint/planner surface with live / registry-backed / seeded labels.
- `/knowledge` is a skill/docs/evidence registry surface with live / registry-backed / seeded labels.
- `/security` is Perry’s security/compliance/risk surface with live / registry-backed / seeded labels.
- `/agents` remains source-labeled and registry-backed.
- Department office pages now include floor-state truth such as desk transitions, conference room state, break room state, evidence drawer records, and handoff lines.

## What is still seeded or placeholder-only

- `/calendar` conference blocks and break/idle lanes are explicitly seeded placeholders.
- `/knowledge` canon documents are explicitly seeded.
- `/approvals` includes an explicit seeded rework lane.
- `/security` includes explicit seeded compliance/release checks.
- `/runtime` remains hybrid and demo-safe for command scenarios, with local persistence.
- `/nettie` remains localStorage-backed for the operator thread.

## API truth

### Local JSON API routes verified
- `/api/health`
- `/api/departments`
- `/api/departments/technology`
- `/api/departments/media`
- `/api/departments/security`
- `/api/departments/finance`
- `/api/departments/opportunity`
- `/api/departments/research`
- `/api/departments/admin`
- `/api/departments/workflows`
- `/api/agents`
- `/api/jobs`
- `/api/jobs/ledger`
- `/api/runtime`
- `/api/runtime/healthz`
- `/api/runtime/health`
- `/api/runtime/snapshot`
- `/api/runtime/alerts`
- `/api/runtime/reconciliation`
- `/api/system`
- `/api/costs`

### Frontend host API fallback
- `https://mission-control-livid-zeta.vercel.app/api/*` returning `index.html` is expected for the frontend-only Vercel shell.
- That behavior is not a blocker in the split architecture.

### Backend API host reachability
- `https://mc-api.sentinelstechnologygroup.com` is now serving JSON successfully for the checked API routes.
- Backend API truth is reachable again.

## 404s in the requested list locally

- None.

## What should be replaced first next

1. Keep the frontend build refreshed so the Vercel host matches the newest local UI.
2. Continue adding live workflow templates and evidence-bearing lanes only where real data exists.
3. Keep the department floors aligned with live registry data and honest empty states.
4. Preserve the split architecture notes and do not turn Vercel into the API truth host unless intentionally migrating backend routes.

## Route summary

| Route | Local status | Frontend host status | Backend host status |
| --- | --- | --- | --- |
| `/missions` | Live | HTML SPA shell, department productization live | not applicable |
| `/approvals` | Live | HTML SPA shell, department productization live | not applicable |
| `/calendar` | Live | HTML SPA shell, department productization live | not applicable |
| `/knowledge` | Live | HTML SPA shell, department productization live | not applicable |
| `/security` | Live | HTML SPA shell, department productization live | not applicable |
| `/departments/command` | Live | HTML SPA shell, department floor states live | not applicable |
| `/departments/technology` | Live | HTML SPA shell, department floor states live | not applicable |
| `/departments/media` | Live but sparse | HTML SPA shell, department floor states live | not applicable |
| `/departments/security` | Live but sparse | HTML SPA shell, department floor states live | not applicable |
| `/departments/finance` | Live but sparse | HTML SPA shell, department floor states live | not applicable |
| `/departments/opportunity` | Live but sparse | HTML SPA shell, department floor states live | not applicable |
| `/departments/research` | Live but sparse | HTML SPA shell, department floor states live | not applicable |
| `/departments/admin` | Live but sparse | HTML SPA shell, department floor states live | not applicable |
| `/agents` | Live | HTML SPA shell, source-labeled desks live | not applicable |
| `/runtime` | Hybrid | HTML SPA shell, runtime shell live | not applicable |
| `/system` | Live | HTML SPA shell, system surface live | not applicable |
| `/costs` | Live | HTML SPA shell, costs surface live | not applicable |
| `/api/runtime` | JSON locally | expected frontend-only fallthrough | JSON on backend host |
| `/api/runtime/healthz` | JSON locally | expected frontend-only fallthrough | JSON on backend host |

## Key replacement order

1. Keep the frontend shell in sync with the latest local build.
2. Keep Vercel `/api/*` classified as frontend-only fallback.
3. Continue productizing the department floors with truthful state where live data exists.
4. Preserve honest empty states instead of inventing activity.
