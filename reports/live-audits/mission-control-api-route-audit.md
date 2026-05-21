# Mission Control API Route Audit

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
| `/api/runtime` | 200 | JSON | Runtime health payload |
| `/api/runtime/healthz` | 200 | JSON | Runtime health alias |
| `/api/runtime/health` | 200 | JSON | Runtime health payload |
| `/api/runtime/snapshot` | 200 | JSON | Runtime snapshot payload |
| `/api/runtime/alerts` | 200 | JSON | Runtime alerts |
| `/api/runtime/reconciliation` | 200 | JSON | Reconciliation payload |
| `/api/system` | 200 | JSON | System truth payload |
| `/api/costs` | 200 | JSON | Cost / ledger telemetry |

## JSON routes

The following requested routes return JSON correctly on the local audited surface:
- `/api/health`
- `/api/departments/technology`
- `/api/departments/media`
- `/api/departments/security`
- `/api/departments/finance`
- `/api/departments/opportunity`
- `/api/departments/research`
- `/api/departments/admin`
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

## Incorrect index.html fall-through

- None on localhost after the runtime route fix and restart.

## Public live host behavior

On `https://mission-control-livid-zeta.vercel.app`, the deployment is stale:
- page routes return `200` with `index.html`
- `/api/runtime` returns `index.html`
- `/api/runtime/healthz` returns `index.html`

This means the deployed public host is still serving the old build. The local API fix is correct, but the public host must be refreshed before live verification can be considered complete.

## 404s

No requested API route returned `404` locally.

## Behavioral notes

- `/api/jobs/summary` reports `truthStatus=LIVE` but also `stale=true`.
- `/api/runtime/health` reports `overallHealth=DEGRADED`.
- `/api/runtime/reconciliation` is also degraded.
- `/api/costs` is live but several values are estimated or unavailable rather than hard-metered.
- `/api/departments/workflows` reports `totalDepartments=9`, `realDepartments=8`, `demoDepartments=1`.
- The local public deployment check is not a code failure; it is a deployment freshness blocker.
