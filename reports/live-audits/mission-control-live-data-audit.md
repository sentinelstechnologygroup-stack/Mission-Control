# Mission Control Live / Static Data Audit

Scope:
- Frontend UI host: `https://mission-control-livid-zeta.vercel.app`
- Backend API host: `https://mc-api.sentinelstechnologygroup.com`
- Local browser shell: `http://127.0.0.1:5173`
- Local API: `http://127.0.0.1:4174`
- Cloudflare Access vars were verified present without printing secrets
- No Aurora terminology used

## Architecture summary

Mission Control is now a split deployment:
- Vercel serves the frontend UI shell and SPA routes.
- The backend/API truth should come from the dedicated backend host.
- Vercel `/api/*` fallthrough is expected frontend-only behavior and is not itself a blocker unless the architecture is intentionally changed.

## Frontend host status

On `https://mission-control-livid-zeta.vercel.app`, UI routes return HTML as expected:
- `/`
- `/missions`
- `/approvals`
- `/calendar`
- `/knowledge`
- `/security`
- `/departments`
- `/departments/technology`
- `/agents`
- `/runtime`
- `/system`
- `/costs`

The frontend host is therefore acting as a static SPA shell, which is correct for this split model.

## Backend API host status

On `https://mc-api.sentinelstechnologygroup.com`, the API host currently returns `403` for the checked runtime/auth-protected paths. This is a live verification blocker on the backend host, not on Vercel.

## Local truth remains green

Locally, the Mission Control UI/API stack remains truthful:
- department overview is live
- office surfaces are live/truthful with honest empty states
- `/api/runtime` and `/api/runtime/healthz` return JSON locally
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
- Department office pages continue to render truthful office shells rather than generic decorative pages.

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

### Backend API host blocker
- `https://mc-api.sentinelstechnologygroup.com` returned `403` on the checked API routes.
- This is the current blocker for live backend verification.

## 404s in the requested list locally

- None.

## What should be replaced first next

1. Resolve backend host access so API JSON can be verified live on `mc-api`.
2. Keep the frontend host as a pure SPA shell unless the architecture is intentionally changed.
3. Continue office-floor productization only after backend host verification passes.
4. Preserve honest empty states instead of inventing activity.

## Route summary

| Route | Local status | Frontend host status | Backend host status |
| --- | --- | --- | --- |
| `/missions` | Live | HTML SPA shell | not applicable |
| `/approvals` | Live | HTML SPA shell | not applicable |
| `/calendar` | Live | HTML SPA shell | not applicable |
| `/knowledge` | Live | HTML SPA shell | not applicable |
| `/security` | Live | HTML SPA shell | not applicable |
| `/departments/command` | Live | HTML SPA shell | not applicable |
| `/departments/technology` | Live | HTML SPA shell | not applicable |
| `/departments/media` | Live but sparse | HTML SPA shell | not applicable |
| `/departments/security` | Live but sparse | HTML SPA shell | not applicable |
| `/departments/finance` | Live but sparse | HTML SPA shell | not applicable |
| `/departments/opportunity` | Live but sparse | HTML SPA shell | not applicable |
| `/departments/research` | Live but sparse | HTML SPA shell | not applicable |
| `/departments/admin` | Live but sparse | HTML SPA shell | not applicable |
| `/agents` | Live | HTML SPA shell | not applicable |
| `/runtime` | Hybrid | HTML SPA shell | not applicable |
| `/system` | Live | HTML SPA shell | not applicable |
| `/costs` | Live | HTML SPA shell | not applicable |
| `/api/runtime` | JSON locally | expected frontend-only fallthrough | 403 on backend host |
| `/api/runtime/healthz` | JSON locally | expected frontend-only fallthrough | 403 on backend host |

## Key replacement order

1. Resolve backend host access and API live verification.
2. Keep the frontend host in frontend-only SPA mode.
3. Continue expanding department office depth only after backend host truth is confirmed.
