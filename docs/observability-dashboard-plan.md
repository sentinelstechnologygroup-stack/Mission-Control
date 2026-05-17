# Observability Dashboard Plan

Status: Draft
Date: 2026-05-17

## Objective
Render Mission Control runtime truth from backend APIs without recomputing or inventing state in the frontend.

## Core runtime truth sources
- /api/ops/observability
- /api/recovery/debt
- /api/reconciliation/queues
- /api/queue/topology
- /api/runtime/checkpoint
- /api/runtime/snapshot/export
- /api/reconciliation/snapshots
- /api/executors/forecast

## Dashboard sections
1. Runtime health
- MC online/offline
- bridge online/offline
- premium executor state
- local AI availability
- restart epoch/session

2. Recovery health
- reconciliation debt score
- queue counts by reconciliation type
- safe_to_resume candidates
- manual-only items
- orphan dependencies

3. Continuity health
- latest checkpoint id
- latest summary id
- summary drift risk
- replay health
- snapshot chain size

4. Memory pressure
- open/blocked/failed/archived counts
- in-memory ledger size
- runtime state size
- largest runtime artifacts summary

5. Queue/executor health
- next recommended actions
- token/cooldown forecast
- deep work paused vs local work active

## Rule
Frontend later renders these packets. It must not invent green states.
