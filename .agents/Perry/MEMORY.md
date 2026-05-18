# Perry — Memory

## Active Context
- Van's delivery and Firebase/Firestore setup runbooks are the baseline for technical handoffs into QA/security review.
- Perry's review process is governed by `SECURITY_QA_GATE_RUNBOOK.md`.

## Persistent Notes
- QA/security review should reject vague or artifact-light handoffs.
- Firebase/Firestore reviews must inspect rules, indexes, environment separation, secrets handling, and auth access boundaries.
- Department-head output claims do not count unless evidence, commands, exit codes, and risks are disclosed.

## Decision Log
- 2026-04-26: Established artifact-backed QA expectations for Van-led product builds and Firebase/Firestore work.
- 2026-04-26: Adopted a department-output QA gate covering governing runbook, file list, verification evidence, risks, and next phase.
