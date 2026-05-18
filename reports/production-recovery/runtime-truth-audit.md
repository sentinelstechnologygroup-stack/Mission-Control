# Runtime Truth Audit

## P0 surfaces
- /operations → partially live
  - queue counts: LIVE
  - recent jobs: LIVE
  - lifecycle board columns: FALLBACK when API unavailable, mixed otherwise
- /reports → partially live
  - report inventory: LIVE from runtime files
  - report freshness: LIVE
  - stale detection: LIVE
- /system → partially live
  - runtime health cards: LIVE
  - runtime alerts: LIVE
  - logs: FALLBACK-capable
  - automations: FALLBACK-capable

## P1 surfaces
- Home quick stats: LIVE from /api/dashboard counts
- Home activity feed: LIVE with fallback row
- Home recent artifacts: LIVE with fallback row
- agent filesystem/state views: LIVE via /api/agents

## Still static / simulated / mixed
- Security page static metrics/alerts
- Intelligence page static publishing queue/signals
- Knowledge page static docs/health cards
- DepartmentStatusBar static department card details
- MissionHealthCards static mission cards
- several home inbox/daily wrap-up cards remain static narrative
