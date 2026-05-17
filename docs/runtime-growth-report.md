# Runtime Growth Report

Date: 2026-05-17
Status: Measured from live filesystem and runtime endpoints

## Current runtime size
- runtime file count: 1,378
- runtime total bytes: 494,504,011
- major contributor classes:
  - runtime summaries and versioned summary snapshots
  - Dana run artifacts under runtime/dana/runs

## Largest current runtime artifacts
- runtime/snapshots/summaries-1779036023201.json — 7.5 MB
- runtime/runtime-summaries.json — 7.3 MB
- runtime/snapshots/summaries-1779036022292.json — 6.7 MB
- multiple Dana ingested candidate JSON files in 3.9–4.8 MB range

## Endpoint payload sizes observed
- /api/runtime/checkpoint — 158,589 bytes
- /api/runtime/snapshot/export — 1,258,435 bytes
- /api/runtime/summaries/latest — 634,519 bytes
- /api/context/compact/nettie — 695,422 bytes
- /api/reconciliation/snapshots — 729,919 bytes

## Risks
- large continuity payloads can become operational bottlenecks
- summaries/latest and compact context are already large enough to pressure operator surfaces and model context windows
- versioned snapshots will continue to grow unless retention/summary-only strategies are enforced

## Safe next controls
- tighter endpoint summary views
- pagination/default limits for heavy history routes
- top-N truncation for unresolved items and blockers in compact contexts
- separate Dana runtime lifecycle from MC core runtime continuity files

## Non-destructive conclusion
Growth is real and measurable. Compaction should remain dry-run/reversible until replay and drift validation are continuously green.
