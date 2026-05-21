# Mission Control Live / Static Data Audit

Scope:
- Routes audited in local Mission Control shell at localhost:5173 and API at localhost:4174
- Cloudflare Access vars were present and verified without printing secrets
- No Aurora terminology used in the audit outputs

## Executive summary

Mission Control is now much closer to truthful live operation. The shell is live, the department overview is live, the department office surfaces now render source-labeled desks and honest empty states, and the runtime/system/cost surfaces are live. Remaining static surfaces are mostly legacy non-office pages and seeded desk truth.

The biggest split:
- Live / hybrid: `/`, `/departments`, `/departments/command`, `/departments/technology`, `/departments/media`, `/departments/security`, `/departments/finance`, `/departments/opportunity`, `/departments/research`, `/departments/admin`, `/runtime`, `/system`, `/costs`
- Source-labeled desk surfaces: `/agents`
- Static / seeded / demo legacy pages: `/missions`, `/approvals`, `/calendar`, `/knowledge`, `/security`

## What loads live

- Home shell and global nav load live.
- Department overview board loads live from the department workflow registry.
- Command / technology department offices load live job data.
- Runtime, system, and cost surfaces load API-backed operational truth.
- Department overview shows 9 departments, with 8 real and 1 demo department.
- Job summary reports 12 queued, 1 running, 3 blocked, 25 completed, and stale=true.
- Runtime health is DEGRADED, not healthy.
- Cost telemetry is live, but several values are estimated or unavailable.

## What is static, seeded, demo, or fallback

- Agents page is now source-labeled and registry-backed, but many desks still resolve as seeded/unavailable instead of fully live.
- Missions page is hardcoded mission cards.
- Approvals page is hardcoded QA gate columns/cards.
- Calendar page is hardcoded dates/events/tasks.
- Knowledge page is hardcoded docs, memories, and ecosystem apps.
- Security page is hardcoded metrics, alerts, and release checks.
- Home page still contains fallback cards for Patrick's Inbox, Activity, Recent Artifacts, System Security, and Daily Wrap-Up.
- Runtime page includes seeded demo commands and a demo-safe blocked market-data flow.
- `/runtime` still persists seed-style state locally.
- `/nettie` still uses localStorage for the operator thread.

## What is live but degraded or partially truthful

- Home activity feed is live.
- Home department board is live, but one department is demo-labeled.
- Home cost panel is live, but some values are unavailable/estimated.
- System is live, but executor lane is unavailable / auth-failed.
- Runtime health is live, but overall health is DEGRADED.
- Runtime reconciliation is live, but degraded.
- Costs are live, but multiple fields are estimated rather than metered.
- Department office pages have live counts, but most offices are empty and missing workflow templates.

## What should be replaced first

1. Department office workflow lanes
   - Add real workflow templates and evidence surfaces to the empty department offices first.
2. Agent desks
   - Replace hardcoded executive/org-chart cards with live agent registry status and desk truth.
3. Home fallback cards
   - Replace silent fallback cards with explicit live/fallback labeling and real source-backed panels.
4. Runtime executor lane
   - Resolve the missing bridge token / auth-failure state so the runtime lane can show real executor truth.
5. Static media / mission / approvals / calendar / knowledge / security pages
   - Convert to live registry-backed operational surfaces or label them clearly as reference libraries.

## Route summary

| Route | Status | Visible truth |
| --- | --- | --- |
| `/` | Live shell + hybrid | Live queues, live activity, live department board; fallback cards remain |
| `/departments` | Live | 9 departments, 8 real / 1 demo, live routing lines, live activity, live queue pressure |
| `/departments/command` | Live but incomplete | Nettie office shows 19 queued jobs, 0 blocked, no workflow templates |
| `/departments/technology` | Live but incomplete | Van office shows 214 workload, 20 blocked, live jobs table, no workflow templates |
| `/departments/media` | Live but sparse | Truth-labeled office shell with honest empty states |
| `/departments/security` | Live but sparse | Truth-labeled office shell with honest empty states |
| `/departments/finance` | Live but sparse | Truth-labeled office shell with honest empty states |
| `/departments/opportunity` | Live but sparse | Truth-labeled office shell with honest empty states |
| `/departments/research` | Live but sparse | Truth-labeled office shell with honest empty states |
| `/departments/admin` | Live but sparse | Truth-labeled office shell with honest empty states |
| `/agents` | Source-labeled / hybrid | Registry-backed desks with live, seeded, static, and unavailable labels |
| `/missions` | Static / seeded | Hardcoded mission cards and lifecycle states |
| `/approvals` | Static / seeded | Hardcoded approval columns and decisions |
| `/calendar` | Static / seeded | Hardcoded events and tasks |
| `/knowledge` | Static / seeded | Hardcoded docs, memory, ecosystem cards |
| `/security` | Static / seeded | Hardcoded infra metrics, alerts, release checks |
| `/runtime` | Hybrid | Live stored jobs/evidence with seeded demo-safe command scenario and local state persistence |
| `/system` | Live | Live executor truth, job counts, runtime alerts, logs, and burn telemetry |
| `/costs` | Live | Live ledger and burn telemetry, but several values remain estimated/unavailable |

## API truth

### JSON API routes
- `/api/health`
- `/api/departments`
- `/api/departments/technology`
- `/api/departments/media`
- `/api/departments/security`
- `/api/departments/finance`
- `/api/departments/command`
- `/api/departments/opportunity`
- `/api/departments/research`
- `/api/departments/admin`
- `/api/departments/workflows`
- `/api/agents`
- `/api/jobs`
- `/api/jobs/ledger`
- `/api/jobs/summary`
- `/api/runtime/health`
- `/api/runtime/snapshot`
- `/api/runtime/snapshot/export`
- `/api/runtime/alerts`
- `/api/runtime/reconciliation`
- `/api/runtime/restart-state`
- `/api/runtime/locks`
- `/api/runtime/summaries`
- `/api/runtime/summaries/latest`
- `/api/runtime/summaries/chain`
- `/api/system`
- `/api/costs`

### Routes that incorrectly return index.html
- None after the runtime route fix and service restart.

### 404s in the requested list
- None of the requested page routes or API routes 404ed during this audit.

## Key replacement order

1. Replace empty department offices with real workflow/evidence/job truth.
2. Replace static agent desks with live agent registry views.
3. Replace home fallback cards with explicit live/fallback/degraded panels.
4. Fix runtime executor auth/bridge truth.
5. Replace static editorial/reference pages with live registry-backed surfaces or clearly label them as reference-only.
