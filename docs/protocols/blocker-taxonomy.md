# Blocker Taxonomy

Mission Control canonical blocker classes:

- BLOCKED_SECURITY
  - Security review, QA gate, guardrail, Perry review, vulnerability, policy gate.
- BLOCKED_COOLDOWN
  - Executor cooldown, provider block, rate limit, token outage, quota pause.
- BLOCKED_DEPENDENCY
  - Explicit blocked dependency, unblock-ready predecessor, dependency chain unresolved.
- BLOCKED_AUTH
  - Credentials, bridge token, auth/session/secrets access failures.
- BLOCKED_RUNTIME
  - Runtime reconciliation gate, worker drift, heartbeat expiry, bridge/runtime unavailable.
- BLOCKED_HUMAN
  - Patrick approval, manual-only recovery, destructive or principal-owned decision.
- BLOCKED_RESOURCE
  - Budget, capacity, memory, CPU, disk, or similar resource pressure.
- BLOCKED_STALE
  - Stale job, stale test artifact, stale heartbeat, stale recovery debt.
- BLOCKED_ORPHANED
  - Registry-only or dependency-orphaned work lacking durable pairing.
- BLOCKED_LOCK_CONFLICT
  - Lock ownership conflict, expired lock, collision between workers/sessions.
- BLOCKED_UNKNOWN
  - Blocked item without sufficient evidence for a stronger class.

Classification inputs:
- status
- route status
- source/sourceType
- task/title/detail/description
- blocked reason / recovery note / next action
- age
- owner
- executor state
- lock metadata

Operational rules:
- Classification is read-only.
- Do not delete jobs based on taxonomy alone.
- Do not auto-clear locks from taxonomy alone.
- Use blocker class to prioritize triage, not to hide operational truth.
