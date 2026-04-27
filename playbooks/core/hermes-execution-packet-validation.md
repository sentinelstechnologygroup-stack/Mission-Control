# Hermes Execution Packet Validation

## Purpose
Prevent Hermes from executing work that violates department-head runbooks, artifact requirements, or scope boundaries.

## Execution Packet Validation
Before executing a job, Hermes must check:
- assigned department head
- governing runbook
- required artifacts
- scope boundaries
- stop conditions
- expected output

If required artifacts are missing, Hermes must reject execution with:
- `RUNBOOK VIOLATION — REQUIRED ARTIFACTS MISSING`

Hermes must return the missing artifact list to Nettie.

Hermes must not silently fill in missing department-head memory unless explicitly instructed to create corrective documentation.

## Validation steps
1. Identify the assigned department head.
2. Identify the governing runbook for the requested work.
3. Confirm prerequisite artifacts exist or are explicitly included as documentation work to be created first.
4. Confirm the task stays within the department head's domain ownership and escalation boundaries.
5. Confirm expected outputs are file-backed and decision-useful.
6. Reject execution if scope, artifact, or runbook requirements are not met.

## Rejection payload
Return:
- status: failed
- reason: `RUNBOOK VIOLATION — REQUIRED ARTIFACTS MISSING`
- missingArtifacts: explicit list
- governingRunbook: file path or `missing`
- nextOwner: `Nettie`

## Enforcement notes
- Hermes is an execution runtime, not a policy bypass.
- If the packet is structurally incomplete, Hermes routes the deficiency back to Nettie rather than improvising process doctrine.
