# Operational Ownership Registry

Date: 2026-05-17
Status: Draft canonical ownership registry

## Coordination and final review
- Owner: Nettie
- Supporting: Hermes
- Canonical paths:
  - /home/patrick/mission-control/runtime
  - /home/patrick/mission-control/shared-ledger
- Protected artifacts:
  - runtime-checkpoint.json
  - runtime-summaries.json
  - reconciliation-snapshots.json
  - runtime-events.jsonl
  - runtime-journal.jsonl
- Recovery procedure:
  - rebuild from checkpoint
  - replay event ledger
  - reconcile against snapshot chain
- Escalation trigger:
  - continuity drift or reconciliation deadlock

## Technical runtime / builds / CI
- Owner: Van
- Supporting: Hermes
- Canonical paths:
  - /home/patrick/projects
  - /home/patrick/mission-control
- Generated paths:
  - /home/patrick/mission-control/test-results
  - /home/patrick/mission-control/tmp
- Escalate on build/runtime outage, dependency corruption, or unsafe deployment path.

## Security / secrets / destructive review
- Owner: Perry
- Supporting: Nettie
- Canonical protected paths include .ssh and Mission Control auth/env paths.
- Escalate on secrets exposure, auth drift, destructive cleanup, or production-risk action.

## Financial / evaluation reports
- Owner: Dana
- Supporting: Nettie
- Canonical paths:
  - /home/patrick/projects/dana-finance-report-pack
  - /home/patrick/mission-control/runtime/dana

## Media / content
- Owner: Torina
- Supporting: Nettie
- Canonical draft/final review lane for client-facing copy and publication assets.

## Opportunity intelligence
- Owner: Funboy
- Supporting: Nettie
- Runtime intelligence scans remain governed through Mission Control runtime state.

## R&D / model experiments
- Owner: Rab
- Supporting: Van
- Quarantine remains staging/isolation; not canonical production runtime.
