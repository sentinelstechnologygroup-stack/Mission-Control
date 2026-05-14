# Van Runtime Recovery and Factory Pipeline Training

Status: Active internal training note
Audience: Van, Hermes, Nettie, Blueprint, Forge, Perry, Mission Control team
Purpose: Teach the Phase D recovery lessons and define the operational mindset for turning Mission Control into a Website and Small App Factory Pipeline.

## Executive doctrine

Mission Control is the authority layer.
Executors do not decide policy.
Cooldown recovery is not a free-for-all restart loop.
Factory throughput matters, but truth and control matter more.

The recovery rule is now mandatory:

```text
cooldown clears
→ reconcile ledger/runtime truth
→ classify recoverable jobs
→ resume only safe_to_resume
→ run missed recurring tasks late
→ report skipped/blocked/manual jobs clearly
```

## Core lessons from Phase D

### 1. No blind auto-resume
Blind auto-resume can:
- restart the wrong job
- duplicate work already in progress elsewhere
- resume a job Patrick already restarted manually
- hide stale or conflicting runtime state

Operational rule:
- auto-resume is forbidden until reconciliation completes
- any unresolved recovery state blocks automatic restart

### 2. Reconcile before resume
Recovery is now a truth-reconciliation problem first, a scheduling problem second.

Required reconciliation sources:
- `/api/active-work`
- `/api/work/registry`
- `/api/jobs/ledger`
- runtime state
- worker state

If these disagree, Mission Control must classify the disagreement before any restart.

### 3. Registry truth must be merged, not single-bucket
A single bucket like `registry.active` is not the full truth.
Queued, running, paused, blocked, project-ledger, and worker-derived state all matter.

Operational rule:
- operator-visible active work must use merged open-work truth
- `active-work` summaries must not imply “nothing is happening” just because one bucket is empty

### 4. Execution intake pauses when recovery state is unresolved
Recovery uncertainty affects fresh execution too.
If Mission Control cannot trust its recovery state, it must not continue launching heavy work as if everything is clean.

Operational rule:
- new execution intake pauses behind the reconciliation gate when recovery is unresolved
- queue acceptance may be recorded, but live execution must not proceed until safe

### 5. Runtime artifacts do not get committed
Generated runtime files are operational artifacts, not source-of-truth code changes.

Do not commit:
- runtime-generated ledgers
- generated reconciliation reports
- temporary queue/runtime snapshots
- local-only diagnostics
- tmp/test-result artifacts unless explicitly requested for audit history

### 6. Generated reconciliation reports stay runtime-only
Recovery reports are for live operations, not for normal source control history.

Examples:
- `shared-ledger/recovery-reconciliation-report.json`
- `shared-ledger/recovery-reconciliation-report.md`

Operational rule:
- keep them available to operators
- do not stage them unless Patrick explicitly requests audit preservation in git

### 7. Cooldown recovery must be safe, late, and durable
“Late is better than never” only applies after safe reconciliation.
Durability means the queue and recurring schedule survive cooldowns and restarts.
Safety means the system refuses ambiguous restarts.

Operational rule:
- preserve queued and recurring work
- resume only the jobs proven safe
- run missed recurring work late
- preserve next recurrence
- clearly report what was skipped and why

## Recovery reconciliation gate

### Required classifications
Every recoverable job must resolve into one of these classes:
- `safe_to_resume`
- `already_running_elsewhere`
- `duplicate`
- `stale_needs_review`
- `blocked_provider`
- `blocked_missing_context`
- `blocked_needs_patrick`
- `cancelled_or_archived`
- `manual_only`

### Required metadata per recoverable job
- recovery classification
- `autoResumeAllowed`
- reason when `autoResumeAllowed=false`
- source of truth
- recommended action

### Hard rules
- only `safe_to_resume` is eligible for auto-resume
- `safe_to_resume` is still blocked while the reconciliation gate remains active
- do not mark complete without evidence
- do not destructively clean up to “make the dashboard nicer”
- do not mutate statuses during reconciliation except to add reconciliation/report metadata when explicitly supported

## Operator expectations

When Patrick asks what is active, the answer must reflect merged truth.
When cooldown clears, the answer must reflect reconciled truth.
When a job is skipped, the reason must be explicit.

Mission Control must be able to say:
- what is safe to resume
- what is already running elsewhere
- what is duplicate
- what is blocked by provider
- what needs Patrick
- what remains manual-only

## Source control hygiene for runtime work

### Commit policy
Stage only:
- source code
- stable tests
- stable docs/playbooks/training notes

Do not stage:
- runtime ledgers
- generated reports
- transient recovery artifacts
- test-results and tmp folders unless requested

### Why
Runtime artifacts are volatile and can:
- create false diffs
- overwrite live operational state
- pollute commit history
- confuse postmortems by mixing source changes with generated state

## Factory Pipeline doctrine

Mission Control must become a Website and Small App Factory Pipeline.
This does not begin with a fake UI. It begins with a trustworthy runtime.

Target workflow:

```text
idea or ZIP
→ intake
→ scope
→ route to Van / Blueprint / Forge / Perry / other owners
→ generate / build
→ QA
→ security review
→ GitHub push
→ preview / deploy
→ Nettie pass/fail report
```

### Runtime-first rule
Build the operational runtime first:
- intake contracts
- queue discipline
- routing policy
- dependency gates
- executor budgeting
- QA/security gates
- reporting truth

UI can follow after the runtime is real.

### Local AI routing doctrine
Route work to local AI whenever GPT/Codex or Claude-grade reasoning is not required.

Local AI is approved for:
- status summaries
- queue triage
- report drafting
- log compression
- routine classification
- low-risk recurring report generation
- first-pass rollups

Local AI is not approved for final decisions on:
- production code
- security
- deployment
- client-facing final copy
- legal or financial conclusions
- high-risk recommendations

### Department-head review chain doctrine
Every agent employee output must be reviewed by the department head before final delivery.

Required review chain:
- agent employee
- department head
- Perry review if QA, security, risk, deployment, auth, secrets, or client-facing
- Nettie final pass/fail/report assembly
- Patrick

Department-head ownership:
- Van reviews technical/build agents
- Perry reviews security/QA/risk gates
- Torina reviews media/content agents
- Dana reviews finance/business evaluation work
- Nettie coordinates final routing and final report

### Daily rollup doctrine
A recurring daily rollup must run at 23:00 local time.

Delivery path:
- local AI drafts first so the report still goes out during GPT cooldown
- department heads provide summarized status
- Perry flags security, QA, and blockers
- Nettie assembles the final report
- Mission Control emails the report to Patrick

Required daily rollup contents:
- completed work
- running work
- queued work
- blocked work
- cooldown/provider state
- recovery gate state
- safe_to_resume items
- manual_only and Patrick-needed items
- agent workload
- next 10 recommended actions
- overnight work recommendations
- risks and blockers

Reliability rule:
- the daily report must still be delivered during provider cooldown
- if GPT/Codex is unavailable, local AI drafts the report
- local-AI output must be marked `local-draft` when used this way
- late is better than missed

## Factory roles

### Nettie
- intake classification
- executive routing
- blocker reporting
- pass/fail reporting
- Patrick escalation

### Van
- technical execution owner
- repo/build implementation
- runtime repair
- deployment prep

### Blueprint
- scoping and architecture shaping
- package decomposition
- build plan creation

### Forge
- generation/build lane
- implementation acceleration
- asset/code assembly

### Perry
- QA gate
- security review
- auth/secrets/deployment guardrails

### Hermes
- governed execution adapter only
- no independent authority
- deterministic runtime machinery

## Training checklist for future work

Before implementing recovery or queue changes, the team must confirm:
- Are we reading merged truth, not a single bucket?
- Can auto-resume restart the wrong thing?
- Are duplicates possible across ledger/runtime/worker/project-ledger views?
- Are runtime artifacts excluded from commits?
- Will execution intake pause when recovery state is unresolved?
- Are missed recurring tasks preserved for late execution?
- Is Patrick only asked for what truly requires approval?

## Anti-patterns to reject

Do not do these again:
- “Cooldown cleared, just restart everything.”
- “`active` is empty, so nothing is running.”
- “Resume first, reconcile later.”
- “Commit the generated report so we remember it.”
- “Mark it complete because the queue looks noisy.”
- “Let Hermes continue normal work outside Mission Control governance.”

## Definitions of done for safe recovery

Recovery is only considered safe when:
- reconciliation report exists
- reconciliation gate status is visible
- open work is reported from merged truth
- each recoverable job has a classification
- auto-resume skips everything except explicitly safe jobs
- missed recurring tasks remain durable and late-runnable
- skipped/blocked/manual jobs are clearly reportable

## Definitions of done for Factory Pipeline v0.1 runtime

The runtime is ready for v0.1 factory work when it can:
- intake an idea or ZIP
- create a scoped job packet
- route to the correct owner/agent lane
- separate blocked vs executable work
- enforce QA/security gates before pass
- push approved code to GitHub
- preserve durable queue state through cooldowns/restarts
- produce a Nettie pass/fail report with evidence
