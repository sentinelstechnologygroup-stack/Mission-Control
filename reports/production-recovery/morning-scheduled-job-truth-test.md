# Morning Scheduled Job Truth Test

Generated: 2026-05-19T03:14:07.290Z

Expected morning jobs:
- Dana Daily Pre-Market Opportunity Report — owner: Dana — source: cronjob:7cd203637ea6
- Dana Weekly Investment Rollup — owner: Dana — source: cronjob:d34ac7ff26c1
- Dana Daily Small-Cap Opportunity Discovery — owner: Dana — source: cronjob:e764312cdd8c
- Funboy Launchpad Daily SaaS Discovery — owner: Funboy — source: cronjob:7646e32d2eab
- Funboy Appraise Daily Mobile Discovery — owner: Funboy — source: cronjob:664f3efa3403
- Nettie Daily Executive CI Summary — owner: Nettie — source: cronjob:9d04026c2a10
- Nettie Weekly Executive CI Wrap-Up — owner: Nettie — source: cronjob:0ba1163ea78f
- Daily EOD CI Review And Learning — owner: Nettie — source: cronjob:e77f54094116
- Options Simulator — owner: Dana — source: expected-but-not-found
- Runtime Health Checks — owner: Nettie — source: expected-supporting-check

Expected behavior:
- If scheduled jobs run successfully and complete, active counts should return to 0 after completion.
- If scheduled jobs fail or stall, blocked/stale counts should increase and the reason should be visible.
- If no scheduled jobs appear at all, scheduling is broken.
- Historical ledger count may remain high, but active dashboards should stay clean between scheduled runs.
