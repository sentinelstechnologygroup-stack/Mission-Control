# Reporting / CI Recovery

## Findings
- Report generation source exists in runtime artifacts under:
  - runtime/dana/runs/*
  - runtime/email-governance/nettie/executive_digest_latest.json
- Report inventory had become operationally stale rather than absent.
- No GitHub Actions workflow directory was found under `.github/workflows` in this repo.
- No authoritative in-repo cron/workflow runner was found for dashboard-facing report freshness enforcement.

## Safe fixes completed
- Added /api/reports/status with stale/fresh classification
- Added /api/reports/recent
- Added /api/reports/stale
- Reports dashboard now consumes freshness-aware status endpoint
- Recent artifacts panel now consumes real recent report artifacts

## Current status
- Reports are now visible with truthful stale status.
- Latest report inventory is live from runtime files.
- Staleness is exposed instead of silently implied current.

## Remaining blocker
- Regeneration cadence is still not restored automatically in this slice.
- To fully recover reporting, the next safe step is wiring scheduled jobs or CI for Dana/Nettie report generation and freshness thresholds.
