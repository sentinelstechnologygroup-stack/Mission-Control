# Home Page Live Data Recovery

Fake/static sections removed or replaced:
- Patrick's Inbox fake rows removed
- Daily Wrap-Up fake narrative removed
- Home status ribbon now uses runtime truth
- Active Missions now comes from `/api/home/summary`
- Department Status now uses `/api/agents`
- System Security now uses `/api/runtime/alerts`

Live endpoints connected:
- /api/home/summary
- /api/agents
- /api/runtime/alerts
- /api/tokens/overview
- /api/activity/recent
- /api/reports/recent

Fallback sections remaining:
- NettieOrchestrationPanel
- CostPanel still depends on existing costs endpoint quality
- sections show FALLBACK/DEGRADED when live data is missing

Tests run:
- node --check changed backend files
- npm run build
- npm run test:integration
- node tests/integration/home-live-data-recovery.mjs

Known blockers:
- NettieOrchestrationPanel still contains static/demo content
- Department drilldown summaries remain shallow
- authenticated production UI verification still blocked by Cloudflare Access
