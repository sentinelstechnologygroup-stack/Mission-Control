# Mission Control Aurora POC Sprint Report

## What was built
- Added a new `/aurora` Mission Control route.
- Built a visible Aurora POC screen with:
  - command intake
  - deterministic routing
  - department tabs
  - stored jobs
  - workflow node timelines
  - evidence drawer
  - Nettie response panel
  - model gateway summary
  - persisted agent messages and evidence logs
- Seeded the screen with demo workflows for Dana, Torina, Icky, Funboy, Perry, and Van.

## Current demo route
- Local route: `/aurora`
- Main operator shell remains intact.
- The new route is reachable from the left rail and route config.

## Backend endpoints added
Aurora now uses backend persistence as the source of truth, with localStorage retained only as fallback/cache.

Verified endpoints:
- `GET /api/aurora/state`
- `GET /api/aurora/jobs`
- `POST /api/aurora/jobs`
- `GET /api/aurora/jobs/:jobId`
- `GET /api/aurora/jobs/:jobId/workflow`
- `GET /api/aurora/jobs/:jobId/nodes`
- `GET /api/aurora/jobs/:jobId/edges`
- `GET /api/aurora/jobs/:jobId/evidence`
- `GET /api/aurora/jobs/:jobId/messages`
- `GET /api/aurora/jobs/:jobId/model-runs`

## Persistence behavior
- `POST /api/aurora/jobs` builds a workflow bundle and merges it into backend state.
- Refreshing `/aurora` rehydrates from `GET /api/aurora/state`.
- The UI still writes to localStorage, but backend state is loaded first and wins when available.
- Job selections, workflow nodes, evidence, messages, and model runs persist across refresh.

## Supported POC capabilities
- Finance read-only demo routing to Dana
- Investor-facing content draft routing to Torina
- Task creation routing to Icky
- Opportunity scan routing to Funboy
- Approval / governance routing to Perry
- Technical QA routing to Van
- Command-center style Nettie response summary
- Persistent evidence-backed node inspection

## Demo script
1. Open `/aurora`.
2. Use a built-in demo command chip or type a command.
3. Observe:
   - routed department
   - stored job record
   - workflow nodes
   - evidence drawer
   - Nettie response
4. Refresh the page and confirm the same job remains selected from backend state.
5. Click a node to inspect its evidence record.
6. Switch departments using the workflow tabs.

## Data / state model
Backend-persisted runtime state contains:
- jobs
- department_workflows
- workflow_nodes
- workflow_edges
- evidence_logs
- agent_messages
- model_runs
- Nettie feed entries

Each job includes:
- id
- requester
- original_command
- normalized_command
- detected_intent
- assigned_department
- assigned_agent_or_node
- status
- priority
- risk_tier
- approval_required
- output_summary
- evidence
- error
- completed_at

## Evidence model
Each node writes a visible evidence record with:
- job id
- workflow id
- node id
- actor
- action
- tool used
- model used
- input summary
- result summary
- raw output
- timestamp

## Office-runtime interpretation
- Jobs are work packets.
- Department tabs are office lanes.
- Workflow nodes are desks/stages.
- Evidence logs are proof-of-work records.
- Nettie remains the traffic-control layer for command intake and routing.

## Approval / risk model
- Tier 0: read-only or answer-only actions
- Tier 1: internal write / draft / note / report
- Tier 2: reversible external write
- Tier 3: destructive, client-facing, financial, legal, credential, deployment, or public action

The current POC keeps risky operations in draft/approval mode.

## QA results
- Build command: passed (`npm run build`)
- Aurora persistence test: passed (`node tests/integration/aurora-runtime-persistence.mjs`)
- Browser route wiring: confirmed at `/aurora`
- Backend API: confirmed for all listed Aurora endpoints
- Refresh persistence: confirmed locally; newly created jobs remain visible after refresh
- GitHub push: succeeded to `origin/main`
- Deployment refresh: not directly verifiable from this session because the live URL resolves to Cloudflare Access
- External destructive actions: not implemented

## Live verification
- Live URL tested: `https://missioncontrol.sentinelstechnologygroup.com/aurora`
- Result: Cloudflare Access login gate blocked authenticated inspection of the live app shell
- Because of the Access gate, live department-page and Aurora-state verification could not be completed from this browser session

## Git metadata
- Aurora persistence commit: `e582c23` (`feat: harden aurora persistence and office aliases`)
- Current pushed branch tip: `ed75660` (`Refresh home cost card on telemetry updates`)

## Known limitations
- Model gateway is still deterministic POC metadata, not live provider execution.
- Live market data is not fetched for the Microsoft share-price demo.
- External email/calendar actions remain draft-only.
- localStorage remains a cache/fallback, not the source of truth.
- Live authenticated verification remains blocked by Cloudflare Access in this session.

## Next steps to Aurora v1
- Add live model-provider execution hooks.
- Add server-backed approval gates.
- Add live evidence and queue APIs.
- Replace demo-mode finance lookup with a real finance provider if approved.
- Re-run live verification once Cloudflare Access-authenticated access is available.
