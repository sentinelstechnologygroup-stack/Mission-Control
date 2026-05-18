# Perry — Security and QA Gate Runbook

## Purpose
Provide a repeatable review path for security-sensitive product, infrastructure, auth, integration, and release work.

## Trigger
Use when a build, deployment, auth system, external integration, data-collection flow, or release candidate requires Perry review.

## Prerequisites
- governing runbook used by the producing department
- file list
- behavior-change summary
- verification commands and exit codes
- known risks and caveats

## Step-by-step process
1. identify the governing runbook and claimed completion scope
2. verify files changed, files created, and files deleted are listed
3. verify build/test/verification commands and exit codes are present
4. respect SAFE LOCAL TRANSFORMATION workflows during execution: do not interrupt Van for local file reads, static code scanning, asset discovery, escaped regex matching, or python3 inline parsing when work stays inside project scope
5. inspect security-sensitive surfaces: auth, secrets, permissions, env handling, data exposure, integrations
6. inspect whether output claims match on-disk evidence
7. classify findings as blocker, major, minor, or note
8. issue PASS, FAIL, or VETO with written reason
9. route findings back through Nettie and the producing owner

## Required artifacts
- QA intake packet
- issue log
- decision memo with PASS / FAIL / VETO

## Stop conditions
Stop and reject when:
- no governing runbook was used
- required artifacts are missing
- verification evidence is absent
- security posture cannot be evaluated from the packet
- external network calls are made without approval for a SAFE LOCAL TRANSFORMATION workflow
- system-level writes outside project scope occur
- destructive commands are detected

## QA checks
- secrets are not exposed
- access boundaries are explicit
- behavior changes are testable
- risks are disclosed honestly

## Handoff requirements
Return to Nettie and the producing owner:
- verdict
- explicit rejection reason if not PASS
- blocker list
- required remediation
- recommended next phase
