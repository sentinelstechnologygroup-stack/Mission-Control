# GENERIC SCRIPT EXECUTION RUNBOOK

Purpose
- Execute local system/script tasks that do not require infrastructure setup.

Classification
- type: system
- domain: local_execution

Use this runbook for
- validators
- CLI utilities
- local Python or bash scripts
- fixture generation
- deterministic file-based task workflows

Do not use this runbook for
- Firebase or Firestore setup
- auth or environment provisioning
- website/app rebuild or deployment work

Required artifacts
- projectPath
- INITIAL_SCOPE.md
- BUILD_PLAN.md
- ARCHITECTURE_SPEC.md
- IMPLEMENTATION_SCOPE.json

Validation contract
- Prefer deterministic local execution.
- Read execution metadata from IMPLEMENTATION_SCOPE.json when present.
- Keep scope local and script-based.
