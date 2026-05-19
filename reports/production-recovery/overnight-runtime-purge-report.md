# Overnight Runtime Purge Report

Generated: 2026-05-19T03:17:49.039Z

Pre-purge counts:
- ledger total: 413
- active-work total: 203
- queued: 63
- running: 7
- blocked: 124
- stale: 180
- lock conflicts: 92

Post-purge counts:
- ledger total: 424
- active-work total: 1
- queued: 0
- running: 1
- blocked: 0
- stale: 0
- lock conflicts: 0

Archive location:
- /home/patrick/mission-control/runtime-archive/purged-active-runtime/2026-05-19-03-14-06-417

Snapshots:
- pre-purge: /home/patrick/mission-control/runtime-purge-snapshots/latest-pre-purge-snapshot.json
- post-purge: /home/patrick/mission-control/runtime-purge-snapshots/latest-post-purge-snapshot.json

Scheduled jobs preserved:
- Dana Daily Pre-Market Opportunity Report
- Dana Weekly Investment Rollup
- Dana Daily Small-Cap Opportunity Discovery
- Funboy Launchpad Daily SaaS Discovery
- Funboy Appraise Daily Mobile Discovery
- Nettie Daily Executive CI Summary
- Nettie Weekly Executive CI Wrap-Up
- Daily EOD CI Review And Learning
- Options Simulator remains expected but currently missing from live scheduler audit
- Runtime health checks remain expected support work

Needs-human-review items:
- project_1a38c07f: Healthcare Teams-to-Zoho Message Logging Middleware — Execution — Open job is not clearly scheduled work and is not safely classifiable as purge noise.

Validation results:
- node --check scripts/runtime-purge-dry-run.mjs
- node --check scripts/runtime-purge-execute.mjs
- node --check lib/runtimePurge.js
- node --check lib/runtimeReconciliation.js
- node --check lib/jobStore.js
- node --check server.js
- node --check backend/runtime/index.js
- node --check backend/ops/index.js
- node --check backend/jobs/index.js
- node --check backend/chat/index.js
- npm run build
- node tests/integration/runtime-purge-policy.mjs
- npm run test:integration
- pm2 restart mission-control
- live probes passed for `/api/runtime/reconciliation`, `/api/runtime/locks`, `/api/triage/summary`, `/api/home/summary`

Exact expectation for tomorrow morning:
- If scheduled jobs run and complete cleanly, active-work should return to 0 after completion.
- If scheduled jobs fail or stall, blocked/stale counts should rise above 0 with visible reasons.
- If no scheduled jobs appear at all, scheduling is broken.

Commit hash:
- resolve with `git rev-parse --short HEAD` at delivery time
