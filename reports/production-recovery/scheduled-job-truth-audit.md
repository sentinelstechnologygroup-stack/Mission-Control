# Scheduled Job Truth Audit

Generated: 2026-05-19T02:46:34.204666Z

## Dana Daily Pre-Market Opportunity Report
- owner: Dana
- schedule source: cronjob:7cd203637ea6
- command/script: Dana daily pre-market research workflow
- output artifact expected: Dana daily pre-market report artifact
- last successful run: 2026-05-01T06:35:37.050930-05:00
- last failed run: not observed
- whether currently active: yes
- whether missing: no
- whether stale: yes

## Dana Weekly Investment Rollup
- owner: Dana
- schedule source: cronjob:d34ac7ff26c1
- command/script: Dana weekly investment rollup workflow
- output artifact expected: Dana weekly rollup artifact
- last successful run: 2026-04-27T05:32:55.783485-05:00
- last failed run: not observed
- whether currently active: yes
- whether missing: no
- whether stale: yes

## Dana Daily Small-Cap Opportunity Discovery
- owner: Dana
- schedule source: cronjob:e764312cdd8c
- command/script: src/agents/dana/jobs/daily_small_cap_job.js
- output artifact expected: Dana daily small-cap report artifact
- last successful run: artifact 2026-05-05T13:02:01.291Z
- last failed run: 2026-05-01T15:20:44.060551-05:00
- whether currently active: yes
- whether missing: no
- whether stale: yes

## Funboy Launchpad Daily SaaS Discovery
- owner: Funboy
- schedule source: cronjob:7646e32d2eab
- command/script: Launchpad daily SaaS opportunity discovery scan
- output artifact expected: Funboy SaaS opportunity scan artifact
- last successful run: not confirmed
- last failed run: 2026-05-01T01:56:43.783363-05:00
- whether currently active: yes
- whether missing: no
- whether stale: unknown

## Funboy Appraise Daily Mobile Discovery
- owner: Funboy
- schedule source: cronjob:664f3efa3403
- command/script: Appraise daily mobile app opportunity discovery scan
- output artifact expected: Funboy mobile opportunity scan artifact
- last successful run: not confirmed
- last failed run: 2026-05-01T02:05:50.317281-05:00
- whether currently active: yes
- whether missing: no
- whether stale: unknown

## Nettie Daily Executive CI Summary
- owner: Nettie
- schedule source: cronjob:9d04026c2a10
- command/script: Daily executive CI summary
- output artifact expected: Executive daily CI summary artifact
- last successful run: 2026-05-01T06:03:54.363770-05:00
- last failed run: not observed
- whether currently active: yes
- whether missing: no
- whether stale: yes

## Nettie Weekly Executive CI Wrap-Up
- owner: Nettie
- schedule source: cronjob:0ba1163ea78f
- command/script: Weekly executive CI wrap-up
- output artifact expected: Executive weekly CI wrap-up artifact
- last successful run: 2026-04-25T06:13:53.594390-05:00
- last failed run: not observed
- whether currently active: yes
- whether missing: no
- whether stale: yes

## Daily EOD CI Review And Learning
- owner: Nettie
- schedule source: cronjob:e77f54094116
- command/script: Daily EOD CI review and independent-learning audit
- output artifact expected: Daily EOD CI review artifact
- last successful run: 2026-05-01T18:09:46.813681-05:00
- last failed run: not observed
- whether currently active: yes
- whether missing: no
- whether stale: yes

## Options Simulator
- owner: Dana
- schedule source: expected-but-not-found
- command/script: options simulator scheduled run
- output artifact expected: Options simulator output artifact
- last successful run: artifact 2026-05-05T13:02:01.291Z
- last failed run: not observed
- whether currently active: no
- whether missing: yes
- whether stale: yes

## Runtime Health Checks
- owner: Nettie
- schedule source: expected-supporting-check
- command/script: Mission Control runtime health / recovery diagnostics
- output artifact expected: Runtime health status evidence
- last successful run: artifact 2026-05-03T14:01:40.728Z
- last failed run: not observed
- whether currently active: no
- whether missing: no
- whether stale: yes
