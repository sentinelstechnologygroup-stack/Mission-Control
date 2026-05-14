# Factory Pipeline v0.1 Implementation Plan

> For Hermes: use subagent-driven-development if this plan is executed. Keep runtime-first. Do not build a fake factory UI before the operational runtime is real.

Goal: turn Mission Control into a trustworthy Website and Small App Factory Pipeline that can intake an idea or ZIP, route it to the correct build lane, enforce QA/security/governance, survive cooldowns and restarts, and return a Nettie pass/fail report.

Architecture: extend the current governed Mission Control runtime rather than rewriting it. Reuse the canonical job ledger, merged work registry, executor governance, and reconciliation gate. Add queue intelligence, dependency graphing, executor budgeting, archival, and observability as runtime modules first; add richer UI only after the runtime contracts are stable.

Tech stack: existing Express backend, runtime JSON stores under `runtime/`, shared operator artifacts under `shared-ledger/`, current agent registry/runtime governance modules, PM2-managed local runtime, GitHub remote workflows.

---

## Scope boundary

In scope for v0.1:
- queue prioritization
- dependency relationships
- executor budget/readiness tracking
- archival strategy
- runtime memory-pressure controls
- stale-job lifecycle management
- ops observability surfaces
- factory-pipeline intake/build/gate/report runtime contracts

Out of scope for v0.1:
- polished factory UI
- fully autonomous production deployment approval
- unmanaged executor operation
- bypassing Perry or Patrick gates
- automatic legal/financial/security signoff

---

## Required modules

### 1. Intake module
Purpose: normalize idea/ZIP/build requests into a canonical factory job packet.

Required outputs:
- intake type: `idea`, `zip_import`, `repo_iteration`, `bugfix`, `content_package`
- source artifact references
- project path / import path
- desired product class: `website`, `landing_page`, `small_app`, `mobile_shell`, `branding_asset`
- requested priority
- requested deadline / operator urgency
- required gates

Suggested files:
- `lib/factoryIntake.js`
- `backend/factory/index.js`
- `tests/integration/factory-intake.mjs`

### 2. Queue prioritization module
Purpose: separate blocked work from executable work and surface the top next actions.

Required outputs:
- priority score
- operator-facing next action
- executable vs blocked lane
- owner/agent route
- token-cost class
- overnight suitability
- review chain metadata
- local-AI eligibility and selected draft route
- daily rollup policy metadata

Suggested files:
- `lib/queuePrioritization.js`
- `tests/integration/factory-queue-prioritization.mjs`

### 3. Dependency graph module
Purpose: model blocked-by relationships and downstream release after prerequisites complete.

Required outputs:
- dependency edges
- unmet prerequisites
- unblock conditions
- downstream resume candidates

Suggested files:
- `lib/jobDependencies.js`
- `tests/integration/factory-dependencies.mjs`

### 4. Executor budgeting module
Purpose: choose the right executor/model lane without wasting capacity or quality.

Required outputs:
- provider state
- selected executor recommendation
- burn-rate class
- recommended execution window
- high/medium/low token-cost queue counts

Suggested files:
- `lib/executorBudgeting.js`
- `tests/integration/factory-executor-budgeting.mjs`

### 5. Archival module
Purpose: move stale noise out of hot runtime views without losing audit trail.

Required outputs:
- archive candidates
- archive reason
- archive destination
- hot-view retention policy

Suggested files:
- `lib/jobArchival.js`
- `tests/integration/factory-archival.mjs`

### 6. Runtime compaction module
Purpose: reduce memory pressure and giant payloads while preserving durable history.

Required outputs:
- paginated ledger views
- capped in-memory history
- archive rollover pointers
- summary views for large job histories

Suggested files:
- `lib/runtimeCompaction.js`
- `tests/integration/factory-runtime-compaction.mjs`

### 7. Stale lifecycle module
Purpose: classify stale queued/running/paused work into recoverable vs manual-only.

Required outputs:
- stale age buckets
- stale classification
- manual-only flag
- recommended recovery action

Suggested files:
- `lib/staleLifecycle.js`
- `tests/integration/factory-stale-lifecycle.mjs`

### 8. Observability module
Purpose: expose operator-truth for runtime, queues, recovery, agents, and pipeline flow.

Required outputs:
- queue health
- executor health
- recovery gate status
- agent workload summary
- factory-pipeline stage summary

Suggested files:
- `lib/factoryObservability.js`
- `tests/integration/factory-observability.mjs`

### 9. Factory orchestration module
Purpose: turn intake packets into stage-based factory workflows.

Required outputs:
- stage transitions
- gate ownership
- GitHub push readiness
- preview/deploy readiness
- pass/fail report packet

Suggested files:
- `lib/factoryPipeline.js`
- `tests/integration/factory-pipeline-v0.1.mjs`

---

## Required queues

### Global queues
- `intake_queue`
- `scoping_queue`
- `build_ready_queue`
- `blocked_queue`
- `qa_queue`
- `security_review_queue`
- `github_push_queue`
- `preview_deploy_queue`
- `reporting_queue`
- `archive_review_queue`

### Cost/throughput overlays
- `token_cost_low`
- `token_cost_medium`
- `token_cost_high`
- `overnight_heavy_candidates`
- `manual_only_queue`
- `patrick_approval_queue`

---

## Required agent roles

### Existing executive roles
- Nettie — intake, routing, prioritization summary, pass/fail reporting, escalation
- Van — technical build owner, runtime/build execution, repo operations
- Perry — QA/security/deployment/auth/secrets gate
- Dana — cost/ROI/budget awareness where product economics matter
- Torina — packaging/content/polish where output is narrative/media-heavy
- Hermes — governed execution adapter only
- Local AI — low-risk draft lane for summaries, queue triage, recurring rollups, report drafting, and first-pass operational synthesis

### Factory role aliases to formalize
- Blueprint — scope and architecture planner
- Forge — generation/build lane executor
- Warden — release/readiness validator
- Scribe/Quill — documentation and content packaging lane

Note: v0.1 can model these as routing roles first even if some still map to existing executors underneath.

---

## Required statuses

### Core job statuses
- `intake_received`
- `scoping`
- `queued`
- `ready_to_build`
- `running`
- `qa_required`
- `security_review_required`
- `github_push_required`
- `preview_ready`
- `deployment_ready`
- `completed`
- `failed`
- `blocked`
- `paused`
- `manual_only`
- `archived`

### Recovery/late-run statuses
- `reconciliation_required`
- `paused_provider_blocked`
- `recoverable_stale`
- `resumed_after_cooldown`
- `running_late`
- `completed_late`
- `already_running_elsewhere`

### Dependency statuses
- `blocked_by_dependency`
- `unblock_ready`
- `downstream_resume_ready`

---

## Required gates

### Hard gates
1. Intake completeness gate
2. Scope clarity gate
3. Build artifact prerequisite gate
4. QA gate
5. Perry security/auth/deployment gate
6. GitHub push gate
7. Preview/deploy gate
8. Recovery reconciliation gate
9. Patrick approval gate for strategic/high-risk work

### Gate ownership
- Nettie: intake, routing, reporting, escalation
- Blueprint: scoping completeness
- Van/Forge: build readiness
- Perry: QA/security/deployment/auth/secrets
- Patrick: production-significant or strategic approval

---

## Bottleneck roadmap in required order

### A. Queue prioritization
Objective: surface what should run next and what must not run yet.

Deliverables:
- priority scoring model
- blocked vs executable separation
- owner/agent routing hints
- operator-visible top 10 next actions endpoint

API additions:
- `GET /api/queue/priorities`
- `GET /api/queue/next-actions`

Acceptance tests:
- blocked work never outranks executable urgent work without explicit override
- top 10 next actions excludes manual-only and unresolved blocked work unless no executable work exists
- owner routing appears in next-actions output

### B. Dependency management
Objective: prevent downstream work from starting too early.

Deliverables:
- job dependency graph
- blocked-by and unblock-condition fields
- downstream resume trigger when upstream completes

API additions:
- `GET /api/jobs/:id/dependencies`
- `POST /api/jobs/:id/dependencies`

Acceptance tests:
- downstream job remains blocked until prerequisite completes
- completion of upstream job marks downstream as `unblock_ready`
- downstream auto-resume still obeys reconciliation and gate rules

### C. Executor budgeting
Objective: keep quality high while respecting model/provider limits.

Deliverables:
- model/provider budget state
- burn-rate forecast
- cost-tier queues
- overnight heavy-work recommendations

API additions:
- extend `GET /api/executors/budget`
- `GET /api/executors/recommendations`

Acceptance tests:
- high token-cost work is flagged for overnight recommendation when not urgent
- local-model triage is never chosen for final production/security/deployment decisions
- cooldown budget state marks heavy provider-dependent work as deferred

### D. Archival strategy
Objective: remove noise from hot views without losing audit history.

Deliverables:
- old failed/test job archive policy
- stale completed archive policy
- duplicate job archival candidates list
- durable archive path with traceability

API additions:
- `GET /api/archive/candidates`
- `POST /api/archive/run` (manual-only in v0.1)

Acceptance tests:
- archive candidate generation does not delete source records
- audit trail remains reconstructable
- runtime views shrink after archival while archive references remain available

### E. Runtime memory pressure
Objective: avoid giant payloads and bloated hot memory.

Deliverables:
- paginated ledger/registry views
- history caps for in-memory structures
- archive offload pointers
- compact summary responses for large jobs

API additions:
- pagination params on ledger/registry endpoints
- `GET /api/runtime/memory`

Acceptance tests:
- large ledger views paginate deterministically
- in-memory history caps do not destroy durable archived history
- operator endpoints remain responsive with large ledgers

### F. Stale-job lifecycle
Objective: handle stale queued/running/paused work systematically.

Deliverables:
- stale lifecycle policy by status class
- recoverable vs manual-only classification
- explicit recommended action per stale job

API additions:
- `GET /api/runtime/stale-jobs`

Acceptance tests:
- stale running job becomes reviewable, not silently resumed
- stale paused provider-blocked job remains blocked until reconciliation + provider health
- stale queued jobs can be separated into recoverable vs archive/manual-only candidates

### G. Ops observability
Objective: give Nettie and Patrick a truthful runtime dashboard without fake polish.

Deliverables:
- runtime dashboard truth packet
- queue health
- executor health
- recovery gate status
- agent workload status
- factory pipeline status

API additions:
- `GET /api/ops/dashboard`
- `GET /api/factory/status`

Acceptance tests:
- dashboard reflects recovery gate truth
- dashboard queue counts match underlying paginated sources
- dashboard shows agent workload and blocked reasons without inventing activity

---

## What can be automated now

Safe for v0.1 automation now:
- intake normalization
- queue scoring
- blocked vs executable separation
- merged work summaries
- reconciliation reporting
- dependency graph evaluation
- token-cost tagging
- overnight recommendation generation
- QA/security gate assignment
- GitHub push readiness checks
- preview/deploy readiness reporting
- Nettie pass/fail summary generation
- archival candidate generation

---

## What still requires Patrick approval

Requires Patrick approval in v0.1:
- production deployment approval
- strategic priority overrides that reorder major queues
- destructive cleanup/archive execution beyond candidate generation
- high-risk client-facing publish decisions
- security-sensitive exception handling
- legal/financial conclusion publication
- changing doctrine that weakens Perry or governance gates
- auto-resume gate clearance policy if evidence is ambiguous

---

## Acceptance suite for Factory Pipeline v0.1

### Intake and routing
- idea intake creates a canonical factory packet
- ZIP intake captures artifact path and scope handoff
- routing assigns the correct owner lane
- low-risk summary/triage/report work is marked local-AI eligible
- production/security/deployment/client-facing final decisions are never marked local-AI final-eligible
- review-chain metadata includes department-head review and adds Perry when QA/security/risk/deployment/auth/secrets/client-facing signals are present
- daily rollup policy is represented with 23:00 local schedule, local-AI first draft path, department-head summary path, Perry blocker flag path, and Nettie final assembly

### Queue and recovery
- blocked and executable work are separated
- top 10 next actions are operator-visible
- reconciliation gate blocks auto-resume until classified
- only `safe_to_resume` can become resume-eligible

### Dependencies
- blocked-by relationships hold downstream work
- upstream completion produces `unblock_ready`

### Budgeting
- provider/model budget state is visible
- burn-rate forecast appears in executor budget output
- high token-cost work receives overnight recommendation when appropriate

### Archival and memory
- archive candidates are generated without destructive deletion
- paginated views reduce payload size without losing durable history

### Factory pipeline flow
- intake → scope → build → QA → security → GitHub push → preview/deploy → Nettie report is represented as a runtime workflow
- pass/fail report includes evidence, owner, and blocker reason
- no fake “factory complete” state appears without the required gates

---

## First implementation slice recommendation

Start with these slices in order:
1. queue prioritization + top 10 next actions
2. dependency graph + blocked-by modeling
3. executor budgeting expansion
4. archival candidate generation
5. paginated runtime views
6. stale lifecycle endpoint
7. factory status/ops dashboard packet

This keeps the work runtime-first, aligned to current bottlenecks, and compatible with the new reconciliation gate.
