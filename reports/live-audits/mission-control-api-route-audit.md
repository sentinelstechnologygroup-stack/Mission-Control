# Mission Control API Route Audit

## Deployment model

Mission Control uses a split deployment:
- Frontend UI host: `https://mission-control-livid-zeta.vercel.app`
- Backend/API truth host: `https://mc-api.sentinelstechnologygroup.com`

Vercel `/api/*` fallthrough is expected frontend-only behavior in this model and is not itself a blocker.

## Frontend host behavior

The frontend host returns HTML as expected for the requested UI routes, and the targeted department-floor work is visible publicly. Alias routes now resolve registry-backed floor truth through the department alias map.

Observed on `https://mission-control-livid-zeta.vercel.app`:
- `/` returns HTML
- `/missions` returns HTML and the mission queue surface is live
- `/approvals` returns HTML and the review inbox surface is live
- `/calendar` returns HTML and the planner/checkpoint surface is live
- `/knowledge` returns HTML and the registry surface is live
- `/security` returns HTML and the Perry security surface is live
- `/departments` returns HTML and the command-center overview is live
- `/departments/technology` returns HTML and the new department floor states are live
- `/departments/media` returns HTML and the new department floor states are live
- `/departments/security` returns HTML and the new department floor states are live
- `/departments/finance` returns HTML and the new department floor states are live
- `/departments/opportunity` returns HTML and the new department floor states are live
- `/departments/research` returns HTML and the new department floor states are live
- `/departments/admin` returns HTML and the new department floor states are live
- `/agents` returns HTML and source-labeled desks are live
- `/runtime` returns HTML and the runtime shell is live
- `/system` returns HTML and the system surface is live
- `/costs` returns HTML and the cost surface is live

## Backend API host behavior

The backend host is now returning JSON for the checked API routes:
- `/api/runtime`
- `/api/runtime/healthz`
- `/api/health`
- `/api/departments/workflows`
- `/api/agents`
- `/api/jobs`
- `/api/system`
- `/api/costs`

## Local request behavior

| Route | Status | Response type | Result |
| --- | --- | --- | --- |
| `/api/health` | 200 | JSON | Live health payload |
| `/api/departments/technology` | 200 | JSON | Van office payload |
| `/api/departments/media` | 200 | JSON | Torina office payload |
| `/api/departments/security` | 200 | JSON | Perry office payload |
| `/api/departments/finance` | 200 | JSON | Dana office payload |
| `/api/departments/opportunity` | 200 | JSON | Funboy office payload |
| `/api/departments/research` | 200 | JSON | Rab office payload |
| `/api/departments/admin` | 200 | JSON | Icky office payload |
| `/api/departments/workflows` | 200 | JSON | 8 real / 1 demo summary |
| `/api/agents` | 200 | JSON | Live agent registry payload |
| `/api/jobs` | 200 | JSON | Job list payload |
| `/api/jobs/ledger` | 200 | JSON | Ledger-backed job truth |
| `/api/runtime/health` | 200 | JSON | Runtime health, overallHealth=DEGRADED |
| `/api/runtime/snapshot` | 200 | JSON | Runtime snapshot payload |
| `/api/runtime/alerts` | 200 | JSON | Runtime alerts |
| `/api/runtime/reconciliation` | 200 | JSON | Reconciliation payload |
| `/api/system` | 200 | JSON | System truth payload |
| `/api/costs` | 200 | JSON | Cost / ledger telemetry |
| `/api/runtime` | 200 | JSON locally | Runtime health payload |
| `/api/runtime/healthz` | 200 | JSON locally | Runtime health alias |

## Incorrect index.html fall-through

- None locally.
- Vercel `/api/*` fallthrough is expected in the frontend-only architecture.

## 404s

No requested route returned `404` locally.

## Behavioral notes

- `/api/jobs/summary` reports `truthStatus=LIVE` but also `stale=true` locally.
- `/api/runtime/health` reports `overallHealth=DEGRADED` locally.
- `/api/runtime/reconciliation` is also degraded locally.
- `/api/costs` is live but several values are estimated or unavailable rather than hard-metered locally.
- `/api/departments/workflows` reports `totalDepartments=9`, `realDepartments=8`, `demoDepartments=1` locally.
- Backend live verification is now passing again on `mc-api`.
- The backend API truth is live again and the department-floor frontend deployment is now fresh on the checked routes.
