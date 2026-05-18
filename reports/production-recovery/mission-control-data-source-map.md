# Mission Control Data Source Map

## Agents
- frontend: src/pages/Agents.jsx
- current endpoint: /api/agents
- backend: lib/agentRegistry.js, lib/agentFilesystem.js, lib/agentStateFilesystem.js
- source: runtime registry + .agents + .agent-state
- fallback: minimal UI-only placeholders if API fails

## Jobs / Queues
- frontend: src/pages/Operations.jsx
- current endpoints: /api/jobs/recent, /api/queues/summary, /api/work/registry, /api/jobs/blocked, /api/jobs/stale
- backend: backend/jobs/index.js, server.js
- source: job ledger + master work registry
- fallback: static task/stage arrays remain as fallback

## Execution status / runtime health
- frontend: src/pages/System.jsx
- current endpoints: /api/runtime/health, /api/runtime/alerts, /api/workers, /api/logs
- backend: backend/ops/index.js, lib/runtimeHealth.js, server.js
- source: platform health + executor status + queue/report/reconciliation summaries
- fallback: logs/automation placeholders remain

## Token / cooldown status
- frontend: src/pages/CostsPage.jsx
- current endpoint: /api/tokens/overview plus /api/costs
- backend: lib/tokenTrackingViews.js, lib/controlPlaneData.js
- source: runtime telemetry + estimated open-job demand
- fallback: unavailable/estimated labels

## Reports
- frontend: src/pages/ReportsPage.jsx, RecentArtifacts.jsx
- current endpoints: /api/reports/status, /api/reports/recent
- backend: buildReports in lib/controlPlaneData.js + truth wrapper in server.js
- source: runtime/dana/runs + runtime/email-governance/nettie
- fallback: explicit fallback row only

## Recent activity
- frontend: ActivityFeed.jsx
- current endpoint: /api/activity/recent
- backend: server.js
- source: recent jobs + recent reports
- fallback: explicit fallback row

## Governance / agent filesystem / state
- frontend: /agents and future governance cards
- current endpoints: /api/agents, /api/governance/summary
- backend: lib/agentRegistry.js
- source: registry + .agents + .agent-state + governance/*.json
- fallback: none preferred beyond unavailable state
