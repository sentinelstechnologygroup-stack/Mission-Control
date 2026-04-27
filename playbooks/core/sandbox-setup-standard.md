# Sandbox Setup Standard

Standard sandbox directory structure and rules for all Mission Control projects.

## When this applies
Every project — app, website, dashboard, ZIP export, or agent job — must have a sandbox before work begins.

## Standard sandbox location
`/home/patrick/mission-control/sandboxes/<project-slug>/`

## Required directories

### shared-ledger/
Canonical project state. Contains:
- `project-state-ledger.md`
- `risk-register.md`
- `department-handoffs.md`
- `pending-memory-updates.md`

### van/
Van build and product execution artifacts:
- phase plans
- phase patch summaries
- QA notes
- scrub audits
- review candidate memos
- typecheck classifications
- project-scoped templates

### hermes-plans/
Hermes agent plan artifacts generated during the project.
Do not store Hermes plans inside product source trees.

## Optional directories

### torina/
Copy and presentation artifacts.

### perry/
Security and release gate artifacts.

### dana/
Finance, ROI, and pricing artifacts.

## Product source location
Product source code lives separately:
`/home/patrick/apps/<project-slug>/workspace/source/`

Product source must never contain sandbox artifacts.
Sandbox must never contain product source files.

## Rules
- Create the sandbox before Phase 0 begins
- All phase outputs go into the sandbox, not the product root
- Cross-department coordination is written into shared-ledger/
- Reusable outputs are promoted to `/home/patrick/mission-control/playbooks/`
- Agent plan files (Hermes, Claude) go into hermes-plans/, not into src/
- Do not store uploaded files, tree dumps, or investigation artifacts in the product root

## Lifecycle stages
Record the current stage in the project ledger:
- INTAKE
- SCOPED
- IN_PROGRESS
- EXEC_QA
- DEPT_QA
- COMPLETE
