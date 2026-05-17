# Runtime Retention Policy

Status: Draft, non-destructive
Date: 2026-05-17

## Objective
Control Mission Control runtime growth without deleting raw audit history or breaking continuity.

## Tier model
- HOT
  - current runtime checkpoint
  - latest summaries
  - latest reconciliation snapshot
  - active governance state
  - active queues and open jobs
- WARM
  - prior incremental summaries
  - versioned snapshots for current restart epoch
  - recent cooldown/recovery artifacts
  - recent worker activity references
- COLD
  - append-only event ledger
  - append-only journal/WAL
  - superseded summaries
  - old reconciliation snapshots
  - historical runtime exports
- ARCHIVED_REFERENCE
  - review-approved cold exports and generated reports kept for audit/reference

## Retention rules
- HOT stays immediately queryable by live APIs.
- WARM stays available for replay/validation and context reconstruction.
- COLD remains append-only and excluded from normal interactive payloads.
- ARCHIVED_REFERENCE is review-gated and should not be deleted without explicit approval.

## Current pain points
- runtime summaries and versioned snapshots are the largest continuity artifacts.
- runtime exports and compact contexts can become oversized if they embed too much historical payload.
- Dana research run artifacts dominate total runtime disk usage and should be lifecycle-managed separately from MC core continuity files.

## Safe controls now
- pagination and summary views instead of full payload dumps
- incremental summaries instead of full regeneration
- snapshot versioning with replay-friendly event/journal files
- stale-context marking without deletion

## Not allowed yet
- destructive pruning
- deleting raw event/journal files
- deleting superseded summaries
- deleting archived references

## Recommended next step
Add max payload thresholds and summary-only fallbacks to the heaviest continuity endpoints before considering any archival execution.
