# Executive Pressure Tests — Initial Assignment Set

Prepared for: Patrick Camacho
Prepared by: Nettie / Hermes
Date: 2026-04-23
Status: Staged doctrine-ready pressure-test packet — not active until Patrick explicitly approves launch
Basis:
- /home/patrick/mission-control/reports/executive-role-clarity-audit-2026-04-23.md
- /home/patrick/mission-control/reports/executive-ci-commitments-2026-04-23-v2.md
- /home/patrick/mission-control/governance/executive-ci-enforcement-framework.md

Purpose
We are not testing compliance. We are testing capability.

Activation rule
- This packet is staged and ready for Patrick review.
- No executive pressure test in this packet is active yet.
- Launch requires explicit Patrick approval.
- Until approval is given, CI execution remains the active priority and this packet functions only as recommendation inventory.

Global completion-report requirement for every executive
Each executive must submit a completion report containing:
- what they did
- how they approached it
- what worked
- what failed
- what they would improve
- what external learning they applied if any
- artifact paths / run ids / evidence
- final decision or recommendation

Immediate flag conditions
- stalled without a concrete blocker report
- avoided a role-owned decision
- produced vague or generic output
- failed to apply learning where the test required it
- failed to preserve work in required artifacts

## 1. Nettie
Why this test
- Nettie's role is clear, but command-center truth still relies too much on chat/session discipline instead of a hardened state-ledger and routing standard.

Pressure test: Executive command-state recovery drill
- objective: Reconstruct a decision-ready command-center state view for all active executive workloads using only artifacts-on-disk and current reporting contracts, then surface the top blockers, ownership collisions, and decisions needed.
- type: integration
- expected output: one command-state recovery packet with active-work ledger, owner/support mapping, blocker map, and Patrick-ready decisions queue.
- required artifacts:
  - COMMAND_CENTER_UPDATE.md
  - project-state ledger snapshot covering all active executive work
  - escalation notice for any unresolved ownership/doctrine collision
- time constraint: 4 hours
- success criteria:
  - every active workload has one primary owner and current state
  - blocker and decision sections are concrete, not narrative filler
  - unresolved doctrine conflicts are explicitly surfaced
  - Patrick could use the packet without asking basic status questions

## 2. Van
Why this test
- Van has proven execution, but repeatable review-candidate discipline and mandatory state/risk/decision packaging are not yet fully hardened.

Pressure test: Review-candidate package under delivery pressure
- objective: Take one live or recent build and convert it into a fully review-ready package with scope, architecture stance, decision log, risk register, QA evidence, and salvage-vs-rebuild recommendation.
- type: execution
- expected output: one complete technical review package that can go to Perry and Nettie without missing control artifacts.
- required artifacts:
  - BUILD_PLAN.md
  - ARCHITECTURE_SPEC.md
  - DELIVERY_STATUS.json
  - risk register
  - decision log
  - SALVAGE_VS_REBUILD_RECOMMENDATION.md
- time constraint: 1 business day
- success criteria:
  - package contains no conceptual-only claims
  - risks, blockers, and next actions are explicit
  - salvage-vs-rebuild call is made and justified
  - package is ready for downstream review without Nettie reconstructing missing context

## 3. Perry
Why this test
- Perry's role is strong, but severity classes, remediation SLAs, and standardized intake evidence are not yet fully normalized.

Pressure test: Security gate decision with incomplete evidence pressure
- objective: Review a security-sensitive workload with at least one intentionally weak evidence area, decide PASS / FAIL / VETO, define remediation severity, and produce a release-control packet that is unambiguous for downstream owners.
- type: decision
- expected output: one explicit release decision with severity class, remediation requirements, deadline expectations, and return-to-green conditions.
- required artifacts:
  - SECURITY_REVIEW.json
  - RELEASE_CLEARANCE.json
  - BLOCK_NOTICE.json if blocked
  - remediation SLA table applied to the case
- time constraint: 3 hours
- success criteria:
  - Perry makes a clear decision instead of asking others to decide risk posture
  - missing evidence is handled explicitly, not glossed over
  - remediation expectations are concrete and severity-backed
  - downstream owner can act immediately from the packet

## 4. Torina
Why this test
- Torina's authority split and review-gate usage are under-specified, and live evidence of repeated public-facing QA gate usage is still thin.

Pressure test: Public-release gate on a flawed outward-facing asset
- objective: Take one outward-facing asset with message, brand, or channel defects and either bring it to public-ready status or reject it with exact reasons and remediation guidance.
- type: stress
- expected output: one public-ready package or one rejection packet detailed enough that the originator can fix it without guessing.
- required artifacts:
  - MESSAGE_FRAME.md
  - CAMPAIGN_BRIEF.md
  - BRAND_REVIEW.md
  - PUBLIC_READY_PACKAGE.md or rejection memo
- time constraint: 4 hours
- success criteria:
  - Torina makes a go / no-go call
  - defects are specific and tied to message fit, brand coherence, or release readiness
  - remediation guidance is operational, not aesthetic hand-waving
  - packet shows clear pre-launch approval ownership

## 5. Dana
Why this test
- Dana's role is strategically clear, but early finance insertion, trigger thresholds, and weekly finance gate standardization need stronger operational proof.

Pressure test: Finance gate on ambiguous ROI case
- objective: Evaluate one initiative with incomplete but workable financial information, define whether it is approve / conditional approve / reject / needs data, and make explicit the assumptions, threshold triggers, and decision consequences.
- type: decision
- expected output: one finance gate packet that converts ambiguous economics into a defendable recommendation.
- required artifacts:
  - ROI_REPORT.json
  - PRICING_MODEL.json or pricing assumptions note
  - BUDGET_APPROVAL.json or finance recommendation memo
  - assumptions checklist
- time constraint: 4 hours
- success criteria:
  - Dana states a clear recommendation
  - missing financial clarity is surfaced precisely
  - assumptions and trigger thresholds are explicit
  - packet is strong enough to steer execution, not just comment on it

## 6. Icky
Why this test
- Icky is not sufficiently pressure-tested on real continuity and records workloads, and the Icky/Nettie boundary remains under-defined in practice.

Pressure test: Continuity rescue and admin reconstruction
- objective: Take one messy active workload with fragmented handoff evidence and reconstruct a retrievable admin package with records index, next-owner visibility, stale-loop detection, and continuity risks.
- type: execution
- expected output: one continuity rescue packet that proves Icky can prevent admin decay on live work.
- required artifacts:
  - ADMIN_STATUS.md
  - RECORDS_INDEX.md
  - FOLLOWTHROUGH_REPORT.json
  - CLEANUP_RECOMMENDATION.md
  - explicit Icky vs Nettie boundary note if a command/admin conflict appears
- time constraint: 1 business day
- success criteria:
  - key records become retrievable
  - stale loops and follow-through gaps are surfaced
  - ownership handoff clarity improves materially
  - packet would let another operator resume the work without continuity loss

## 7. Funboy
Why this test
- Funboy is functioning, but confidence thresholds, noise filtering, and routing discipline to Dana versus Rab need harder proof.

Pressure test: Opportunity triage with confidence and routing discipline
- objective: Scan a live batch of weak-to-moderate signals, rank them by confidence, kill low-quality noise, and route surviving items explicitly to Dana, Rab, or monitor-only with justification.
- type: integration
- expected output: one ranked opportunity packet showing evidence quality, confidence score, and next-owner routing for each surviving signal.
- required artifacts:
  - OPPORTUNITY_BRIEF.json
  - SIGNAL_CLUSTER.json
  - source log with confidence notes
  - route-to-Dana / route-to-Rab / hold rationale
- time constraint: 3 hours
- success criteria:
  - weak signals are killed instead of over-packaged
  - routing logic is explicit and repeatable
  - evidence quality is visible per item
  - output demonstrates judgment, not just collection effort

## 8. Rab
Why this test
- Rab's strategic charter is clear, but live concept-to-POC pressure and concept kill/advance discipline are not yet sufficiently proven.

Pressure test: Concept-to-POC conversion with kill/advance decision
- objective: Take one ambiguous opportunity and convert it into a structured concept model, explicit assumptions, testable hypothesis set, POC path, and kill / hold / advance recommendation.
- type: learning application
- expected output: one concept package that shows Rab can turn ambiguity into a testable path using an external concept-framing method from CI work.
- required artifacts:
  - CONCEPT_MODEL.json
  - HYPOTHESIS.json
  - POC_PLAN.json
  - concept maturity stage assessment
  - note naming the external framework applied
- time constraint: 1 business day
- success criteria:
  - concept stops being vague
  - top assumptions are ranked and testable
  - a clear kill / hold / advance call is made
  - external learning is visibly applied, not just mentioned

## 9. Bea
Why this test
- Bea has the biggest org-placement mismatch and needs proof that reporting ownership can still produce high-signal reusable intelligence under ambiguity.

Pressure test: Multi-source executive rollup under source-quality pressure
- objective: Take outputs from multiple departments with uneven source quality and convert them into one structured executive rollup that exposes gaps instead of hiding them.
- type: stress
- expected output: one decision-useful rollup with source-sufficiency judgments, reusable structure, and explicit unresolved gaps.
- required artifacts:
  - ROLLUP_REPORT.md
  - INTELLIGENCE_SUMMARY.md
  - source-sufficiency checklist
  - escalation note for org-placement or source-quality blockers if encountered
- time constraint: 4 hours
- success criteria:
  - Bea does not fake completeness where sources are weak
  - report structure remains reusable and high signal
  - missing upstream evidence is flagged clearly
  - final rollup is useful for leadership decisions despite imperfect inputs
