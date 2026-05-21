# Mission Control Live / Static Data Audit

Scope:
- Local browser shell: `http://127.0.0.1:5173`
- Local API: `http://127.0.0.1:4174`
- Public live host checked for deployment truth: `https://mission-control-livid-zeta.vercel.app`
- Cloudflare Access vars were verified present without printing secrets
- No Aurora terminology used

## Executive summary

Mission Control’s local productization phase is now materially more truthful. The five legacy pages targeted in this phase have been converted into source-labeled operational surfaces:
- `/missions`
- `/approvals`
- `/calendar`
- `/knowledge`
- `/security`

The department office surfaces remain live/truthful and continue to show honest empty states where live work is absent. The local runtime API now returns JSON for `/api/runtime` and `/api/runtime/healthz`.

The remaining blocker is the public live deployment: the public host still serves an older build. On the public host, `/api/runtime` and `/api/runtime/healthz` still return `index.html`, so live deployment verification is blocked until the updated build is deployed.

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

- `/missions` is now a live work queue surface with live / registry-backed source labels.
- `/approvals` is now an executive review and QA/security gate inbox with live / registry-backed / seeded labels.
- `/calendar` is now an operational schedule/checkpoint/planner surface with live / registry-backed / seeded labels.
- `/knowledge` is now a skill/docs/evidence registry surface with live / registry-backed / seeded labels.
- `/security` is now Perry’s security/compliance/risk surface with live / registry-backed / seeded labels.
- `/agents` remains source-labeled and registry-backed.
- Department office pages continue to render truthful office shells rather than generic decorative pages.

## What is still seeded or placeholder-only

- `/calendar` conference blocks and break/idle lanes are explicitly seeded placeholders.
- `/knowledge` canon documents are explicitly seeded.
- `/approvals` includes an explicit seeded rework lane.
- `/security` includes explicit seeded compliance/release checks.
- `/runtime` remains hybrid and demo-safe for command scenarios, with local persistence.
- `/nettie` remains localStorage-backed for the operator thread.

## Local API truth

### JSON API routes verified locally
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

### Incorrect index.html fall-through locally
- None.

### 404s in the requested list locally
- None.

## Public live host verification

The public host is reachable, but it is serving an older build.

Observed on `https://mission-control-livid-zeta.vercel.app`:
- page routes return `200` with `index.html`
- `/api/runtime` returns `index.html`
- `/api/runtime/healthz` returns `index.html`

This means public live deployment verification is blocked until the updated build is deployed.

## What should be replaced first next

1. Deploy the updated build so the public host matches local truth.
2. Continue upgrading any remaining seeded placeholders in `/calendar`, `/knowledge`, and `/security` if live sources become available.
3. Continue expanding live evidence in department office surfaces where workflows are still sparse.
4. Keep `/api/runtime` and `/api/runtime/healthz` under JSON truth on the deployed host.

## Route summary

| Route | Local status | Visible truth |
| --- | --- | --- |
| `/missions` | Live | Live queue, live/registry-backed source labels, explicit empty states |
| `/approvals` | Live | Live review inbox, registry-backed security gates, seeded rework lane |
| `/calendar` | Live | Live checkpoints, registry-backed planner, seeded conference blocks |
| `/knowledge` | Live | Registry-backed skills/permissions, seeded canon docs, live evidence posture |
| `/security` | Live | Live security queue, registry-backed audits, seeded release checks |
| `/departments/command` | Live | Truthful office shell with live queue and honest empty states |
| `/departments/technology` | Live | Strongest office surface, live queue and honest empty states |
| `/departments/media` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/security` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/finance` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/opportunity` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/research` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/admin` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/agents` | Live | Registry-backed desks with live, seeded, static, and unavailable labels |
| `/runtime` | Hybrid | Live stored jobs/evidence with seeded demo-safe command scenarios |
| `/system` | Live | Live executor truth, job counts, runtime alerts, logs, and burn telemetry |
| `/costs` | Live | Live ledger and burn telemetry, with estimated/unavailable fields where applicable |

## Key replacement order

1. Keep the new public deployment aligned with local truth.
2. Convert any remaining seeded placeholders into live feeds only when true sources exist.
3. Continue to fill out departmental workflow templates and evidence lanes where live history exists.
4. Preserve honest empty states instead of inventing activity.
