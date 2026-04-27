# Sandbox Isolation Rule

## Purpose
Every job, product build, and agent workflow must run in its own isolated sandbox.

## Core requirements
- One sandbox per job.
- Shared work must go through the shared ledger.
- Department-specific work stays in department sub-sandboxes.
- Cross-department coordination is explicit and recorded.
- No hidden state sharing between jobs.

## Standard sandbox structure
- `shared-ledger/` — canonical handoff notes, briefs, summaries, approvals
- `nettie/` — command coordination
- `van/` — build and product execution
- `torina/` — copy and presentation
- `perry/` — security / release gating
- `dana/` — finance / ROI / pricing
- other department folders as needed

## Rules for handoffs
- Write decisions into the shared ledger.
- Include job id, owner, timestamp, and next action.
- Do not rely on chat history as the source of truth.
- Do not move work across sandboxes without a recorded handoff.

## Lifecycle
- INTAKE
- SCOPED
- IN_PROGRESS
- EXEC_QA
- DEPT_QA
- NETTIE_QA
- COMPLETE

## Enforcement
Before any action that changes product state, the job must be mapped to a sandbox and the owning department must be known.