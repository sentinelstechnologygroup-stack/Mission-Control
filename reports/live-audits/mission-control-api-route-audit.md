# Mission Control API Route Audit

## Verified request behavior

| Route | Status | Response type | Result |
| --- | --- | --- | --- |
| `/api/health` | 200 | JSON | Live health payload |
| `/api/departments/technology` | 200 | JSON | Van office payload |
| `/api/departments/media` | 200 | JSON | Torina office payload |
| `/api/departments/security` | 200 | JSON | Perry office payload |
| `/api/departments/finance` | 200 | JSON | Dana office payload |
| `/api/agents` | 200 | JSON | Live agent registry payload |
| `/api/jobs` | 200 | JSON | Job list payload |
| `/api/jobs/ledger` | 200 | JSON | Ledger-backed job truth |
| `/api/runtime/health` | 200 | JSON | Runtime health, overallHealth=DEGRADED |
| `/api/runtime/snapshot` | 200 | JSON | Runtime snapshot payload |
| `/api/runtime/snapshot/export` | 200 | JSON | Snapshot export alias |
| `/api/runtime/alerts` | 200 | JSON | Runtime alerts |
| `/api/runtime/reconciliation` | 200 | JSON | Reconciliation payload |
| `/api/runtime/restart-state` | 200 | JSON | Restart state |
| `/api/runtime/locks` | 200 | JSON | Lock view |
| `/api/runtime/summaries` | 200 | JSON | Large summary feed |
| `/api/runtime/summaries/latest` | 200 | JSON | Latest summary |
| `/api/runtime/summaries/chain` | 200 | JSON | Summary chain |
| `/api/departments` | 200 | JSON | Department registry |
| `/api/departments/workflows` | 200 | JSON | 8 real / 1 demo summary |
| `/api/system` | 200 | JSON | System truth payload |
| `/api/costs` | 200 | JSON | Cost / ledger telemetry |
| `/api/runtime` | 200 | JSON | Runtime health payload |
| `/api/runtime/healthz` | 200 | JSON | Runtime health alias |

## JSON routes

The following requested routes return JSON correctly:
- `/api/health`
- `/api/departments/technology`
- `/api/departments/media`
- `/api/departments/security`
- `/api/departments/finance`
- `/api/agents`
- `/api/jobs`
- `/api/jobs/ledger`
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

## Incorrect index.html fall-through

None after the runtime route fix and service restart.

This specific API routing bug is resolved on the audited local surface.

## 404s

No requested API route returned 404 during the audit.

## Behavioral notes

- `/api/jobs/summary` reports `truthStatus=LIVE` but also `stale=true`.
- `/api/runtime/health` reports `overallHealth=DEGRADED`.
- `/api/runtime/reconciliation` is also degraded.
- `/api/costs` is live but several values are estimated or unavailable rather than hard-metered.
- `/api/departments/workflows` says `totalDepartments=9`, `realDepartments=8`, `demoDepartments=1`.
