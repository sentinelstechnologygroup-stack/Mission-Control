# Runtime Purge Policy

Mission Control overnight purge policy.

## Safe to archive / purge from active runtime
- stale test jobs
- lock conflict jobs older than the current session window
- duplicate retries
- orphan jobs with no live dependency
- blocked jobs with stale heartbeat
- completed historical jobs still counted as active
- failed old local bridge attempts
- stale report generation attempts
- old queue test artifacts
- jobs from previous dev/testing phases not linked to current scheduled work

## Do not purge from history
- archived records
- reports
- evidence
- snapshots
- failed-run evidence

## Do not purge from active if
- job is a currently scheduled Dana/Funboy/CI/options run
- job has a fresh heartbeat and is clearly current
- job is actively running now for legitimate scheduled work
- job is tied to current report generation
- job is part of active production deployment
- uncertainty exists

## Uncertain items
- Write uncertain items to `runtime-purge-review/needs-human-review.json`
- Do not purge uncertain items automatically

## Execution rules
- Archive before purge
- No permanent deletion without archive
- Clear stale locks only when the owning session is dead or the job is being purged
- Keep dashboard visibility; relabel history instead of hiding it
- Historical ledger totals may remain high, but active surfaces must represent current work only
