# Snapshot Compaction Policy

Status: Draft, reversible only
Date: 2026-05-17

## Objective
Reduce snapshot sprawl while preserving replay, auditability, and drift validation.

## Current behavior
- runtime checkpoint writes current JSON
- summaries write current JSON + versioned snapshot
- reconciliation snapshots write current JSON + versioned snapshot
- events and journal remain append-only

## Compaction rules (future)
1. Keep latest live JSON artifacts untouched.
2. Keep versioned snapshots for current restart epoch in WARM tier.
3. Mark older versioned snapshots as compaction candidates after they are represented by:
   - append-only event ledger
   - append-only journal
   - later incremental summaries
4. Never compact if replay validation fails.
5. Never compact unresolved reconciliation evidence.

## Required validation before any compaction
- checksum matches live artifact
- replayRuntimeLedger reproduces latest artifact identifiers
- latest summary chain remains intact
- unresolved items preserved across chain
- prior snapshot still reachable through audit references

## Dry-run only right now
Compaction may only produce:
- candidate counts
- candidate sizes
- reversible plan
No deletion or file moves are authorized.
