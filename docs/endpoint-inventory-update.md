# Endpoint Inventory Update

Date: 2026-05-17

## Added continuity endpoints
- GET /api/runtime/checkpoint
- POST /api/runtime/checkpoint
- GET /api/runtime/snapshot/export
- GET /api/runtime/summaries
- GET /api/runtime/summaries/latest
- GET /api/runtime/summaries/:id
- GET /api/runtime/summaries/chain
- POST /api/runtime/summaries/rollup
- POST /api/runtime/summaries/compress
- GET /api/context/compact/:agent
- GET /api/context/eviction-candidates
- GET /api/reconciliation/snapshots
- POST /api/reconciliation/snapshots

## Added runtime truth endpoints from prior slices
- GET /api/ops/observability
- GET /api/reconciliation/queues
- GET /api/reconciliation/queues/:type
- GET /api/archive/candidates
- POST /api/archive/compact-dry-run
- GET /api/queue/topology
- GET /api/recovery/debt
- GET /api/executors/forecast
- GET /api/runtime/restart-state
