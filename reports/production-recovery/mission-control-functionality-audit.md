# Mission Control Functionality Audit

Date: 2026-05-18

## P0 broken critical
- Production URL root
  - route/page: https://missioncontrol.sentinelstechnologygroup.com/
  - component/file: deployment surface behind Cloudflare Access
  - currently: partially live (access gate only externally verifiable)
  - expected real data source: authenticated frontend -> backend APIs
  - actual current data source: Cloudflare Access login gate blocks dashboard verification
  - broken interactions: cannot verify dashboard content without authenticated access
  - missing API endpoint: none
  - missing backend data: none proven from external gate alone
  - static fallback must remain: n/a

- Operations queue cards
  - route/page: /operations
  - component/file: src/pages/Operations.jsx
  - currently: partially live
  - expected real data source: /api/jobs/recent, /api/queues/summary, /api/work/registry
  - actual current data source: now real for counts/recent jobs; static stage columns remain fallback when API errors
  - broken interactions: some lifecycle lane content still static fallback-derived
  - missing backend data: richer blocked/stale detail now added, but no full per-stage canonical board source yet
  - static fallback must remain: yes
  - priority: P0

- Reports freshness
  - route/page: /reports
  - component/file: src/pages/ReportsPage.jsx
  - currently: partially live
  - expected real data source: runtime Dana/Nettie report artifacts
  - actual current data source: /api/reports/status, /api/reports/recent backed by runtime files
  - broken interactions: no authenticated production verification; stale count currently high because reports are genuinely old
  - missing backend data: report regeneration state/failed generation history
  - static fallback must remain: yes
  - priority: P0

- Runtime health / alerts
  - route/page: /system
  - component/file: src/pages/System.jsx
  - currently: partially live
  - expected real data source: /api/runtime/health, /api/runtime/alerts, /api/workers, /api/logs
  - actual current data source: health/alerts now real; automations/logs still mixed with placeholder fallback
  - broken interactions: state/settings tabs still partially static; no truth labels on every legacy widget
  - missing backend data: richer automation schedule truth, log classification summaries
  - static fallback must remain: yes
  - priority: P0

## P1 core dashboard
- Home quick stats
  - route/page: /
  - component/file: src/pages/Home.jsx
  - currently: partially live
  - expected: /api/dashboard counts
  - actual: real quick stats from dashboard counts; inbox/wrap-up/authority chain remain static
  - fallback must remain: yes

- Activity feed
  - route/page: /
  - component/file: src/components/mission-control/ActivityFeed.jsx
  - currently: partially live
  - expected: /api/activity/recent
  - actual: now live with fallback row when endpoint fails
  - fallback must remain: yes

- Recent artifacts
  - route/page: /
  - component/file: src/components/mission-control/RecentArtifacts.jsx
  - currently: partially live
  - expected: /api/reports/recent
  - actual: now live with fallback row when endpoint fails
  - fallback must remain: yes

## P2 useful operational feature
- Costs page
  - route/page: /costs
  - component/file: src/pages/CostsPage.jsx
  - currently: live-ish/partial
  - expected source: /api/costs plus /api/tokens/overview
  - actual source: /api/costs and token overview-derived runtime data
  - missing backend data: native token telemetry still estimate-heavy
  - fallback must remain: yes

- Agents page
  - route/page: /agents
  - component/file: src/pages/Agents.jsx
  - currently: live
  - expected source: /api/agents
  - actual: file-backed runtime registry including agentFilesystem and agentState
  - fallback must remain: minimal only

## P3 polish/static still remaining
- Security page
- Intelligence page
- Knowledge page
- some home mission/department cards
- system settings groups
These still contain substantial static/manual arrays and should not be marketed as fully live yet.
