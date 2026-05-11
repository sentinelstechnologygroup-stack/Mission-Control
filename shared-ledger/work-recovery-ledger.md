# Mission Control — Work Recovery Ledger
_Last synced: 2026-05-11T21:39:25.034Z_
_Total entries: 140 | Outage flags: 0_

## Recovery Quick Reference
- Resume a job: `curl -s -X POST http://localhost:4174/api/chat -d '{"message":"resume job_xxx"}'`
- Get active work: `curl -s http://localhost:4174/api/work/recovery-ledger`
- Sync ledger: `curl -s -X POST http://localhost:4174/api/work/recovery-ledger/sync`
- Mark complete: `curl -s -X POST http://localhost:4174/api/work/recovery-ledger/update -d '{"jobId":"job_xxx","status":"completed"}'`




## 🟢 ACTIVE / RUNNING (19)

| Job ID | Task | Owner | Status | Source | Last Update | Outage |
|--------|------|-------|--------|--------|-------------|--------|
| project_cdaded1d | Healthcare Teams-to-Zoho Message Logging Midd | Van | running | MC UI | 2026-05-11T21:39 | no |
  - **Next:** Monitor for completion
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| project_e341a738 | Shared Groceries App — Phase 7 — Final Scrub  | Van | complete | MC UI | 2026-05-11T21:39 | no |
  - **Next:** Archive or close
| job_54b2d4e9 | test | Van | complete | MC UI | 2026-05-11T20:55 | no |
  - **Next:** Archive or close
| job_01c7ced6 | MISSION CONTROL — PHASE 2 / SYS-004
ADD VALID | Hermes | complete | MC UI | 2026-05-01T18:30 | no |
  - **Next:** Archive or close
| job_89e4c6cf | Have Van own Gulf Coast Prosthetics Redesign- | Van | complete | MC UI | 2026-04-27T00:13 | no |
  - **Next:** Archive or close
| job_2cd64a44 | Have Torina own Gulf Coast Prosthetics Redesi | Torina | complete | MC UI | 2026-04-27T00:13 | no |
  - **Next:** Archive or close
| job_3aaa960f | Have Perry own Gulf Coast Prosthetics Redesig | Perry | complete | MC UI | 2026-04-27T00:13 | no |
  - **Next:** Archive or close
| job_9f25cd1a | build test payload | Hermes | complete | MC UI | 2026-04-26T23:21 | no |
  - **Next:** Archive or close
| job_1bc50fcd | Nettie — execute Hermes executive memory test | Hermes | complete | MC UI | 2026-04-26T22:59 | no |
  - **Next:** Archive or close
| job_46276d2b | Nettie — execute test payload | Hermes | complete | MC UI | 2026-04-26T22:42 | no |
  - **Next:** Archive or close
| job_db2481d5 | execute test payload irl-routing-check-2 | Hermes | complete | MC UI | 2026-04-26T22:26 | no |
  - **Next:** Archive or close
| job_531543d6 | hermes-ledger-integration-test | Hermes | complete | MC UI | 2026-04-26T22:01 | no |
  - **Next:** Archive or close
| job_b7da0de4 | foundation-check | Hermes | complete | MC UI | 2026-04-26T21:31 | no |
  - **Next:** Archive or close
| job_d3a1a11b | new feature | Van | running | MC UI | 2026-04-26T16:44 | no |
  - **Next:** Monitor for completion
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_76b6ec28 | Have Van start the Comss-MWD project locally. | Van | running | MC UI | 2026-04-26T16:44 | no |
  - **Next:** Monitor for completion
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_49e9dbc7 | fix operational brief duplication | Van | complete | MC UI | 2026-04-26T13:57 | no |
  - **Next:** Archive or close
| job_0c0017e2 | Nettie / Van — FIX operational brief classifi | Van | complete | MC UI | 2026-04-26T13:57 | no |
  - **Next:** Archive or close
| job_349c0f2a | Nettie / Van — FIX intent routing ORDER (not  | Van | complete | MC UI | 2026-04-26T13:57 | no |
  - **Next:** Archive or close
| job-template-cleanup | Remove template dependencies and junk | Van | complete | MC UI | 2026-04-18T20:30 | no |
  - **Next:** Archive or close


## ⬜ QUEUED (39)

| Job ID | Task | Owner | Status | Source | Last Update | Outage |
|--------|------|-------|--------|--------|-------------|--------|
| job_97c28c47 | audit CI enforcement gate. Audit-only: valida | Perry | queued | MC UI | 2026-05-02T03:04 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_9620c4f3 | the CI phase lock directive in /home/patrick/ | Van | queued | MC UI | 2026-05-02T03:04 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_73de4496 | Queue Perry for audit-only Security/QA review | Perry | queued | MC UI | 2026-05-01T23:41 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_eb7eec2c | Queue Perry for audit-only CI enforcement rev | Van | queued | MC UI | 2026-05-01T23:37 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_822be12b | Queue Perry for audit-only CI enforcement rev | Perry | queued | MC UI | 2026-05-01T23:37 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_f9891314 | Queue Perry for CI gate audit on the Sentinel | Van | queued | MC UI | 2026-05-01T23:37 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_b75bcddd | Audit-only CI enforcement review for the Van  | Perry | queued | MC UI | 2026-05-01T23:36 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_663ffc2a | Have Van work on this exactly as written:

MI | Hermes | queued | MC UI | 2026-05-01T18:31 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_8b34eb00 | SDL QA guardrails: verify canonical nav/foote | Perry | queued | MC UI | 2026-05-01T18:27 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_18ab24e3 | Perry | Perry | queued | MC UI | 2026-05-01T18:26 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_be72c50b | SDL lessons rollout: one canonical layout/nav | Van | queued | MC UI | 2026-05-01T18:25 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_2894b96c | checks | Perry | queued | MC UI | 2026-05-01T18:24 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_c936f966 | Have Van review SYS-004 deterministic task re | Van | queued | MC UI | 2026-05-01T17:58 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_1bfa0ea0 | Have Van own SYS-004 deterministic task resul | Van | queued | MC UI | 2026-05-01T17:55 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_9aee8f6d | enforcement lock routing smoke packet 2026-04 | Rab | queued | MC UI | 2026-04-30T15:49 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_69f941cc | pricing review for new product | Dana | queued | MC UI | 2026-04-30T15:49 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_a25f7e5e | to Van: test Hermes bridge browser fetch. Rep | Van | queued | MC UI | 2026-04-27T03:18 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_9eae88eb | Have Van own Hermes bridge browser fetch test | Van | queued | MC UI | 2026-04-27T03:17 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_2e71dac7 | Hermes bridge testing after restart | Van | queued | MC UI | 2026-04-27T03:15 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_182019de | a real Mission Control job assigned for bridg | Perry | queued | MC UI | 2026-04-27T03:15 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_a1b24b76 | Hermes bridge testing | Van | queued | MC UI | 2026-04-27T02:57 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_e7ffd6a0 | a new refinement job referencing the missing  | Van | queued | MC UI | 2026-04-26T22:27 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_0f2840bd | Refine job_abc123 into implementation-ready a | Hermes | queued | MC UI | 2026-04-26T22:27 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_dd668984 | hermes-ledger-integration-test-queued | Hermes | queued | MC UI | 2026-04-26T22:01 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_f8832aa3 | ingest-image | Hermes | queued | MC UI | 2026-04-26T21:32 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_608c4944 | MISSION CONTROL — JOB OUTPUT SANITIZATION LOC | Nettie | queued | MC UI | 2026-04-26T20:43 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_a54ffd72 | MISSION CONTROL — SINGLE OUTPUT ENFORCEMENT L | Nettie | queued | MC UI | 2026-04-26T20:40 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_a29229c9 | MISSION CONTROL — RESPONSE DOMINANCE COLLAPSE | Van | queued | MC UI | 2026-04-26T20:36 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_dad16327 | Good — this screenshot is the clearest one ye | Nettie | queued | MC UI | 2026-04-26T20:35 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_8627d01d | MISSION CONTROL — HARD PIPELINE SEPARATION FI | Van | queued | MC UI | 2026-04-26T20:33 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_9a25decf | MISSION CONTROL — FINAL OUTPUT ASSEMBLY GATE  | Van | queued | MC UI | 2026-04-26T20:31 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_faae6e45 | CARTLY / SHARED GROCERY LIST — F1.7 FIRESTORE | Perry | queued | MC UI | 2026-04-26T19:54 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_920ffb52 | MISSION CONTROL — TEST HARNESS CONTRACT RESET | Perry | queued | MC UI | 2026-04-26T19:46 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_485dd9d8 | MISSION CONTROL — FINAL OUTPUT CONTRACT ENFOR | Perry | queued | MC UI | 2026-04-26T19:45 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_04f65ae5 | MISSION CONTROL — TEST HARNESS OUTPUT CONTRAC | Van | queued | MC UI | 2026-04-26T19:37 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_a25fcffd | MISSION CONTROL SYSTEM VALIDATION TEST  PURPO | Van | queued | MC UI | 2026-04-26T19:35 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job-hermes-bridge | Wire Hermes into Mission Control | Van | queued | MC UI | 2026-04-24T20:33 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job-agent-routing | Control agents through the mission ledger | Van | queued | MC UI | 2026-04-24T20:32 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`
| job_db94b268 | Have Van start the Comss-MWD project locally. | Van | queued | MC UI | 2026-04-24T19:47 | no |
  - **Next:** Assign to agent or trigger via MC chat
  - **Resume:** `curl -s -X POST http://localhost:4174/api/chat -H "Content-Type: application/jso...`



## ❌ FAILED (82)

| Job ID | Task | Owner | Status | Source | Last Update | Outage |
|--------|------|-------|--------|--------|-------------|--------|
| job_a489f6a1 | Nettie: No Codex credentials stored. Run `her | Van | failed | MC UI | 2026-05-09T19:17 | no |
  - **Next:** Review and update status
| job_907675bc | MISSION CONTROL — FORCE VAN START + DURABLE P | Hermes | failed | MC UI | 2026-05-02T03:04 | no |
  - **Next:** Review and update status
| job_201bb3a7 | Queue Perry for Security/QA audit-only review | Van | failed | MC UI | 2026-05-01T23:41 | no |
  - **Next:** Review and update status
| job_f8973436 | Queue Perry for audit-only CI enforcement rev | Van | failed | MC UI | 2026-05-01T23:41 | no |
  - **Next:** Review and update status
| job_13df2edd | Nettie — escalate execution watch on job_9620 | Hermes | failed | MC UI | 2026-05-01T23:34 | no |
  - **Next:** Review and update status
| job_616d2cdf | Queue Van for CI phase lock directive in /hom | Hermes | failed | MC UI | 2026-05-01T22:32 | no |
  - **Next:** Review and update status
| job_9b4cfa73 | Queue Van to execute the CI ENFORCEMENT + PRO | Hermes | failed | MC UI | 2026-05-01T22:29 | no |
  - **Next:** Review and update status
| job_a2040263 | Queue Van for this directive exactly as writt | Hermes | failed | MC UI | 2026-05-01T22:29 | no |
  - **Next:** Review and update status
| job_849feb24 | MISSION CONTROL — PHASE 2 / SYS-004
ADD VALID | Hermes | failed | MC UI | 2026-05-01T18:29 | no |
  - **Next:** Review and update status
| job_f328c1d8 | Have Van work on SYS-004 add deterministic ta | Hermes | failed | MC UI | 2026-05-01T17:59 | no |
  - **Next:** Review and update status
| job_0f3fc067 | build website | Hermes | failed | MC UI | 2026-05-01T17:57 | no |
  - **Next:** Review and update status
| job_6f4091c8 | Have Van work on SYS-004 deterministic task r | Hermes | failed | MC UI | 2026-05-01T17:55 | no |
  - **Next:** Review and update status
| job_aff8c29a | MISSION CONTROL COMMAND — BLOG CONTENT EXECUT | Hermes | failed | MC UI | 2026-04-30T22:29 | no |
  - **Next:** Review and update status
| job_dabd570d | Have Van perform Phase 1 Base44 local scrub f | Hermes | failed | MC UI | 2026-04-29T02:10 | no |
  - **Next:** Review and update status
| job_1cef6c8b | Nettie — HARD MODE OVERRIDE:  Disable executi | Hermes | failed | MC UI | 2026-04-27T03:37 | no |
  - **Next:** Review and update status
| job_f6f97288 | test | Hermes | failed | MC UI | 2026-04-27T03:29 | no |
  - **Next:** Review and update status
| job_005a569b | foundation-check | Hermes | failed | MC UI | 2026-04-27T03:20 | no |
  - **Next:** Review and update status
| job_16de058e | test Hermes bridge browser fetch | Hermes | failed | MC UI | 2026-04-27T03:17 | no |
  - **Next:** Review and update status
| job_56823916 | browser fetch bridge test | Hermes | failed | MC UI | 2026-04-27T03:16 | no |
  - **Next:** Review and update status
| job_370d29f2 | Nettie — execute test payload after restart | Hermes | failed | MC UI | 2026-04-27T03:16 | no |
  - **Next:** Review and update status
| job_c18c10f2 | bridge validation ping | Hermes | failed | MC UI | 2026-04-27T03:15 | no |
  - **Next:** Review and update status
| job_21105d5a | Hermes bridge test | Hermes | failed | MC UI | 2026-04-27T03:14 | no |
  - **Next:** Review and update status
| job_08c7e563 | server.js routing patch validation | Nettie | failed | MC UI | 2026-04-27T03:00 | no |
  - **Next:** Review and update status
| job_a1a02165 | Nettie — execute test payload | Hermes | failed | MC UI | 2026-04-27T03:00 | no |
  - **Next:** Review and update status
| job_a719c363 | test Hermes bridge | Hermes | failed | MC UI | 2026-04-27T02:58 | no |
  - **Next:** Review and update status
| job_a2a0953e | Nettie — execute test Hermes bridge payload | Hermes | failed | MC UI | 2026-04-27T02:58 | no |
  - **Next:** Review and update status
| job_2ce5e991 | bridge-smoke-test | Hermes | failed | MC UI | 2026-04-27T02:56 | no |
  - **Next:** Review and update status
| job_759b4081 | Nettie — execute test Hermes bridge | Hermes | failed | MC UI | 2026-04-27T02:56 | no |
  - **Next:** Review and update status
| job_05c8f68f | MISSION CONTROL — FIX NETTIE/MC → HERMES RESP | Hermes | failed | MC UI | 2026-04-27T02:44 | no |
  - **Next:** Review and update status
| job_e21a8832 | Have Torina work on PROJECT: Gulf Coast Prost | Hermes | failed | MC UI | 2026-04-26T23:33 | no |
  - **Next:** Review and update status
| job_91bb83b9 | Have Perry work on PROJECT: Gulf Coast Prosth | Hermes | failed | MC UI | 2026-04-26T23:33 | no |
  - **Next:** Review and update status
| job_6cf21ffd | Have Van work on PROJECT: Gulf Coast Prosthet | Hermes | failed | MC UI | 2026-04-26T23:33 | no |
  - **Next:** Review and update status
| job_ffa7968d | build test payload | Hermes | failed | MC UI | 2026-04-26T23:23 | no |
  - **Next:** Review and update status
| job_6f41f437 | duplicate-preserve-check 1777245018 | Hermes | failed | MC UI | 2026-04-26T23:10 | no |
  - **Next:** Review and update status
| job_18f499a4 | Nettie — execute fix routing bug 1777245018 | Hermes | failed | MC UI | 2026-04-26T23:10 | no |
  - **Next:** Review and update status
| job_1fc07746 | Nettie — execute fix routing bug 1777244950 | Hermes | failed | MC UI | 2026-04-26T23:09 | no |
  - **Next:** Review and update status
| job_12a23377 | duplicate-preserve-check 1777244950 | Hermes | failed | MC UI | 2026-04-26T23:09 | no |
  - **Next:** Review and update status
| job_0ba39040 | Nettie — execute fix routing bug 1777244681 | Hermes | failed | MC UI | 2026-04-26T23:04 | no |
  - **Next:** Review and update status
| job_7d3201f2 | v21 cleanup task 1777244681 | Van | failed | MC UI | 2026-04-26T23:04 | no |
  - **Next:** Review and update status
| job_b7bc0da7 | duplicate-protection-check task | Hermes | failed | MC UI | 2026-04-26T22:57 | no |
  - **Next:** Review and update status
| job_7afa148a | Nettie — execute executive memory routing val | Hermes | failed | MC UI | 2026-04-26T22:56 | no |
  - **Next:** Review and update status
| job_35417184 | executive memory regression cleanup task 1777 | Van | failed | MC UI | 2026-04-26T22:56 | no |
  - **Next:** Review and update status
| job_190c8c41 | duplicate-protection-check task 1777244210 | Hermes | failed | MC UI | 2026-04-26T22:56 | no |
  - **Next:** Review and update status
| job_bf3ae46e | distinct-execution-check task 1777244210 | Hermes | failed | MC UI | 2026-04-26T22:56 | no |
  - **Next:** Review and update status
| job_0deca359 | job: irl-v15-regression | Nettie | failed | MC UI | 2026-04-26T22:52 | no |
  - **Next:** Review and update status
| job_d54474b7 | v1.2 refinement validation cleanup task | Van | failed | MC UI | 2026-04-26T22:49 | no |
  - **Next:** Review and update status
| job_75d8bdbc | job: test | Nettie | failed | MC UI | 2026-04-26T22:49 | no |
  - **Next:** Review and update status
| job_432c7df3 | Nettie — analyze this dataset | Hermes | failed | MC UI | 2026-04-26T22:49 | no |
  - **Next:** Review and update status
| job_4e3a1808 | Nettie-prefixed refinement isolation verifica | Van | failed | MC UI | 2026-04-26T22:27 | no |
  - **Next:** Review and update status
| job_30f509eb | refinement isolation verification cleanup tas | Van | failed | MC UI | 2026-04-26T22:26 | no |
  - **Next:** Review and update status
| job_90964d09 | IRL governed routing validation artifact clea | Van | failed | MC UI | 2026-04-26T22:26 | no |
  - **Next:** Review and update status
| job_9dce3652 | Nettie — execute test payload irl-routing-che | Hermes | failed | MC UI | 2026-04-26T22:26 | no |
  - **Next:** Review and update status
| job_d976ae0d | hermes-ledger-integration-test-unauthorized | Hermes | failed | MC UI | 2026-04-26T22:01 | no |
  - **Next:** Review and update status
| job_35520387 | job: irl-v14-regression | Nettie | failed | MC UI | 2026-04-26T21:17 | no |
  - **Next:** Review and update status
| job_0a178391 | job: irl-v13-regression | Nettie | failed | MC UI | 2026-04-26T20:46 | no |
  - **Next:** Review and update status
| job_c639742e | job: irl-v12-regression | Nettie | failed | MC UI | 2026-04-26T20:36 | no |
  - **Next:** Review and update status
| job_f29e2599 | job: irl regression test | Nettie | failed | MC UI | 2026-04-26T20:22 | no |
  - **Next:** Review and update status
| job_b27f028f | job: audit regression | Nettie | failed | MC UI | 2026-04-26T19:33 | no |
  - **Next:** Review and update status
| job_88aadab3 | job: test audit | Nettie | failed | MC UI | 2026-04-26T16:58 | no |
  - **Next:** Review and update status
| job_8ddd1322 | job: regression test | Nettie | failed | MC UI | 2026-04-26T16:44 | no |
  - **Next:** Review and update status
| job_c32d7aa9 | job: validation test | Nettie | failed | MC UI | 2026-04-26T16:19 | no |
  - **Next:** Review and update status
| job_bbd924d0 | a new job - do NOT modify ledger - do NOT dis | Van | failed | MC UI | 2026-04-26T16:19 | no |
  - **Next:** Review and update status
| job_2913182f | job: test task | Nettie | failed | MC UI | 2026-04-26T15:56 | no |
  - **Next:** Review and update status
| job_40eb0caa | Have Van start the Comss-MWD project locally. | Van | failed | MC UI | 2026-04-26T15:05 | no |
  - **Next:** Review and update status
| job_f53b2b93 | Nettie / Van — FIX system-level instruction r | Van | failed | MC UI | 2026-04-26T15:05 | no |
  - **Next:** Review and update status
| job_5ca0d00e | Nettie — hold execution.  For each RUNNING jo | Van | failed | MC UI | 2026-04-26T14:28 | no |
  - **Next:** Review and update status
| job_3a87edd2 | the remaining 137 iterations now | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_ca51d697 | the remaining 137 iterations | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_59b3be52 | the Comss-MWD recovery validation test job 17 | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_cad11fce | the validation-probe-1777072408 | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_d1fae101 | validation-dedupe-check | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_a9e13ec3 | validation-probe-1777072482 | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_8b1f0830 | job_x | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_edbcb860 | job_x routing | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_5cb276d1 | Nettie / Van — prevent placeholder job execut | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_2926a7dd | Nettie / Van — confirm execution capability.  | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_1ae3498f | Nettie / Van — FIX question vs execution misc | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_2f2ec07b | start job_xxxxxxxx | Van | failed | MC UI | 2026-04-25T03:05 | no |
  - **Next:** Review and update status
| job_8f9bb93c | research scan for competitor signals | Ivy | failed | MC UI | 2026-04-24T20:34 | no |
  - **Next:** Review and update status
| job_1e02c932 | content packaging for release notes | Torina | failed | MC UI | 2026-04-24T20:34 | no |
  - **Next:** Review and update status
| job_02d6c99f | ROI budget model for iteration backlog | Dana | failed | MC UI | 2026-04-24T20:34 | no |
  - **Next:** Review and update status
| job_b975c8a4 | QA regression for iteration backlog | Perry | failed | MC UI | 2026-04-24T20:34 | no |
  - **Next:** Review and update status
