# Operational Triage Center Report

Status: Implemented and validated.

Triage route:
- Added `src/pages/OperationalTriage.jsx`
- Added route: `/triage`
- Added visible nav link: `Triage Center`

Source alignment status:
- Triage page is backed by `/api/triage/summary`.
- Raw source alignment panel exposes ledger, registry, active-work, and queue counts side-by-side.
- Current truth status at validation time: `DEGRADED`.

Blocker taxonomy results:
- Triage page groups blocked jobs by canonical blocker class.
- Top examples and recommended actions are shown per class.

Lock conflict status:
- Triage page includes active lock, conflict, stale-lock, and owner counts.
- Read-only lock governance summary is live from `/api/runtime/locks`.

Stale debt status:
- Triage page surfaces stale jobs, stale reports, stale artifacts, and orphan debt.

Tests run:
- `node tests/integration/operational-triage-page.mjs`
- `npm run build`
- `npm run test:integration`
- `npm run test:ui-hardening`

Known blockers:
- Runtime truth is intentionally ugly right now because stale debt and lock-conflict pressure remain unresolved.
- Artifact freshness is report-driven today and can be expanded later with broader artifact indexing.

Next recommended safe auto-fix phase:
- Add a controlled archival / stale-lock review lane with dry-run previews only.
