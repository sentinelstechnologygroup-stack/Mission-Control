# Executive Summary

Generated: 2026-05-17T16:24:27.386597+00:00

- Canonical agent folder (draft): `/home/patrick/agents`
- Git repos detected: 26
- Project-like directories under /home/patrick/projects: 23
- Duplicate overlap groups detected: 3068
- Generated directories detected: 6168
- Large files >=100MB: 23
- Sensitive path hits (name-pattern only): 200

## Key findings
- Runtime state is active under /home/patrick/mission-control/runtime and related shared-ledger artifacts; these should not be moved without migration planning.
- `/home/patrick/agents` is the current draft canonical agent path based on code references.
- Duplicate/staging ZIPs and generated folders exist across /home/patrick/projects and related staging areas; archive planning is warranted later.
- Git repos and project copies need canonical ownership mapping before any relocation.

## Recommended next action
- Implement additive runtime continuity hardening while preserving all current runtime JSON compatibility, then separately review archive/migration candidates with explicit approval.
