# Nettie Response Engine Report

Status: Implemented and validated.

Commands supported:
- `status`
- `queue_status`
- `blocked_jobs`
- `stale_jobs`
- `report_status`
- `runtime_health`
- `triage_summary`
- `route_to_agent`
- `create_task`
- `deployment_request`
- approval-gated fallback
- unknown-command fallback

Endpoint created:
- `POST /api/nettie/command`
- `GET /api/nettie/conversations/recent`

UI wired:
- Nettie console now calls `/api/nettie/command` through `api.nettieCommand(...)`.
- Reply extraction now prefers `replyMarkdown`.

Task-routing behavior:
- Safe route/create commands use Mission Control assignment flow.
- Created jobs are returned in `createdJobs`.
- No external AI dependency is required for deterministic task handling.

Approval gate behavior:
- Production deployment requests return `requiresApproval: true` with a clear reason.
- No autonomous production approval occurs.

Tests run:
- `node tests/integration/nettie-command-response-engine.mjs`
- `npm run test:integration`

Known limits:
- Response engine is deterministic/rule-based, not model-reasoned.
- Some UI surfaces still summarize results via markdown rather than dedicated structured chips.

Next phase:
- Add richer structured rendering for queried sources, created jobs, and approval banners inside the Nettie UI.
