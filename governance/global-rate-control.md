# Global API Rate-Control Rule

## Purpose
All outbound API / model / provider requests must pass through a governed rate-control layer. No direct uncontrolled calls from jobs, sandboxes, or agents.

## Required behavior
The layer must provide:
- queueing
- throttling
- retry logic with backoff and jitter
- fallback routing
- request prioritization
- cooldown windows after failures
- telemetry and audit logging
- per-sandbox budgets

## Priority classes
- **P0**: user-facing blocking work, release gating, critical approvals
- **P1**: active product build tasks, important sync jobs
- **P2**: normal research, summary generation, internal ops
- **P3**: background, low-priority, or deferred work

## Budget rules
- Each sandbox gets its own budget envelope.
- Budgets are tracked independently per job.
- Sandboxes may not borrow from one another without explicit escalation.
- High-priority jobs can preempt lower-priority queue items, but preemption must be logged.

## Retry policy
- Use exponential backoff.
- Add jitter.
- Stop retrying after the configured limit.
- On repeated failure, route to fallback providers or defer.

## Fallback policy
If the primary provider fails:
1. retry within budget
2. route to fallback provider
3. if still failing, cool down the sandbox queue
4. persist failure details to the shared ledger

## Telemetry
Log at minimum:
- request id
- sandbox id
- job id
- provider
- priority
- queue wait time
- retry count
- success/failure status
- fallback path used

## Enforcement
Any new automation, worker bridge, or agent runtime must be wired through this policy before making live outbound calls.