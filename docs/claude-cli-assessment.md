# Claude CLI Executor Assessment

Status: manual break-glass only
Route id: claude_cli
Assessed for: Mission Control v0.2 Phase C governed executor runtime

Conclusion
- Claude CLI is not reliable enough on this machine to become a governed core Mission Control executor route.
- Do not build automatic fallback routing around it.
- Leave it manual break-glass only until a cleaner auth + structured-output path is proven.

Evidence summary
1. Auth state mismatch
- `claude auth status` reported logged-in state.
- Noninteractive execution still produced 401 invalid authentication credential failures.

2. Noninteractive output exists but is noisy
- `claude -p` supports noninteractive output.
- Structured output options exist (`json`, `stream-json`, `json-schema`).
- Stream/init events include metadata such as cwd/session details that require careful filtering.

3. Exit codes are not sufficient alone
- Failure detection requires parsing structured payloads, not just exit codes.
- Validation/usage failures can emit noisy traces.

4. Working directory pinning is possible
- CWD can be pinned per run.
- That alone is not enough to qualify it as a reliable executor.

Operational policy
- `claude_cli` remains break-glass/manual-only.
- It must not be treated as a reliable automatic cooldown fallback.
- Mission Control should not advertise it as primary/autonomous until auth and structured-result reliability are proven.
