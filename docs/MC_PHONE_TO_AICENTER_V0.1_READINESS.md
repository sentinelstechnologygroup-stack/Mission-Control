# MC Phone-to-AICenter v0.1 Readiness

Status: Functionally validated
Date: 2026-05-13

## Functional validation

Hosted frontend validation passed from `/nettie` against the live backend path.

Validated prompt:
- `Nettie — summarize the current Mission Control architecture in 5 bullet points.`

Observed behavior:
- initial reply kind: `pending`
- final reply kind: `nettie_async`
- route used during Codex cooldown: `fallback-cooldown`
- result: real five-bullet architecture answer, not queue analysis

This confirms the hosted deployment includes the behavioral fixes introduced by commit `b85d058` and later hotfixes that kept freeform prompts out of queue analysis.

## Truth-state / bridge status

Current validated backend truth:
- bridge connected: yes
- selected executor: codex
- executor ready: no
- cooldown active: yes
- fallback available: yes
- fallback executor: hermes
- fallback mode: automatic-on-cooldown
- fake success states: none introduced

## Cleanup-only stabilization applied

### 1. Stale queued-job cleanup policy
Added a narrow stale test-job sweeper:
- only targets queued jobs
- only matches stale test/validation/smoke/ping-style tasks
- age threshold: 12 hours
- cancels them with route status `archived-stale-test-job`
- archives a snapshot before cancellation

### 2. Archive path for old test jobs
Archive file:
- `runtime/job-archives/stale-test-jobs.json`

Latest sweep archived stale queued validation/test jobs without touching non-test production work.

### 3. UI wording update
Nettie status label updated from:
- `Cooling down`

to:
- `Codex limited / Hermes active`

This keeps the state truthful while reflecting that live fallback is active.

## Verification snapshot

### PM2
- `mission-control`: online
- `mc-api-tunnel`: online

### Health
- `/api/health`: 200 OK

### Executor status
- available: true
- bridgeConnected: true
- executor: codex
- executorReady: false
- executorCoolingDown: true
- queueDepth: 4
- fallback.available: true
- fallback.executor: hermes
- fallback.autoRoutable: true

### Registry summary snapshot
- active: 0
- running: 3
- queued: 31
- blocked: 99
- completedRecent: 25
- paused: 0

### Archive snapshot
- archived stale test-job entries: 12

## Security / exposure checks

- no auth weakening introduced
- no token values committed
- no `.env` changes staged for push
- protected bridge endpoints remain bearer-token gated

## Scope guard

This pass intentionally avoided new major architecture:
- no persistent worker-loop work in this pass
- no broad refactors
- no auth relaxation

## Readiness decision

MC Phone-to-AICenter v0.1 is functionally validated for:
- hosted frontend command entry
- authenticated backend bridge
- truthful executor status
- live freeform Nettie replies
- Hermes fallback during Codex cooldown

Recommended next phase:
- v0.2 implementation lane after this stabilization pass is accepted
