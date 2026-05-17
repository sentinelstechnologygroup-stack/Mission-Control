# Archive Lifecycle Policy

Status: Draft, non-destructive
Date: 2026-05-17

## Lifecycle classes
- active
- warm
- cold
- archived_reference
- superseded
- duplicate
- obsolete_test
- manual_review_required

## Archive intent
Mission Control archive actions must preserve audit trails and runtime replay capability.

## Eligible later archive candidates
- duplicate job artifacts after review
- stale completed/test outputs after review
- superseded summaries after continuity validation
- old dry-run reports and generated QA artifacts

## Protected artifacts
- runtime-checkpoint.json
- runtime-summaries.json
- reconciliation-snapshots.json
- runtime-events.jsonl
- runtime-journal.jsonl
- active job ledger
- current shared-ledger state

## Approval gates
- Perry review for destructive lifecycle changes touching security, auth, secrets, or deployment evidence
- Nettie review for orchestration impact
- Patrick approval for destructive archive/cleanup execution

## Current rule
Archive planning only. No destructive archive actions.
