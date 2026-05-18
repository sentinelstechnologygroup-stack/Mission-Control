# Institutional Learning Standard

Status: Active foundational protocol

## Classification
- incident: operational failure, degraded behavior, broken handoff, or trust-impacting runtime issue
- win: demonstrable improvement, successful governed execution, or recovery success
- failed build: any build/test/lint/typecheck execution that fails with persisted evidence
- successful deploy: verified deployment or redeploy with healthy post-checks
- hallucination event: fabricated or unverified claim that affected operational output
- recovery pattern: repeatable method that safely restores service or execution continuity
- postmortem: structured review of incident + causes + fixes + prevention
- heuristic: compact operational lesson extracted from incidents or wins

## Department responsibilities
- Nettie summarizes incidents/wins into executive-operational language
- Van converts build/runtime failures into delivery and CI process improvements
- Perry converts incidents into controls, review gates, and risk flags
- Rab converts recurring failures or opportunities into experiments/R&D ideas
- Dana records cost, ROI, or waste-related lessons where relevant

## Rules
- raw logs remain audit artifacts
- summaries must be evidence-backed
- failures should become heuristics or postmortems when repeatable
- no secret-bearing raw material should be exposed in summary files
