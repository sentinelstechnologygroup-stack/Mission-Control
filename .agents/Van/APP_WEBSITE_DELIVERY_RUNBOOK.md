# Van — App / Website Delivery Runbook

## Purpose
Convert an approved idea into a real, reviewable website or app without Patrick micromanaging each step.

## Trigger
Use this runbook when Nettie routes Van a new build, rebuild, export hardening, or technical salvage task.

## Operating standard
- No conceptual completion.
- Every stage produces on-disk artifacts.
- Frontend experience must be custom.
- Architecture can reuse patterns; final user-facing structure cannot be template-cloned.
- QA and security gates are inputs, not optional extras.

## Primary owners
- Nettie: intake, routing, priorities, escalations, final executive convergence
- Van: architecture, build path, execution sequencing, technical delivery
- Perry/QA: security, risk, release gate, defect severity
- Torina: packaging, presentation, asset quality if user-facing launch matters
- Dana: budget, ROI, pricing constraints when relevant

## Default build sequence

### 1. Intake and scope lock
Van must collect or create these artifacts before build starts:
- `INITIAL_SCOPE.md`
- `BUILD_PLAN.md`
- `ARCHITECTURE_SPEC.md`
- `IMPLEMENTATION_SCOPE.json`

Minimum questions Van must answer inside scope artifacts:
- What is being built: website, web app, mobile app, internal tool, export hardening, or rebuild?
- Who is the user?
- What are the core flows?
- What is the source of truth for data?
- Is this net-new, salvage, or migration?
- What is explicitly in V1 and out of scope?
- What integrations or auth are required?
- What is the release environment?

If those answers are missing, Van does not start implementation. Van escalates the missing fields to Nettie.

### 2. Technical decision pass
Van decides and records:
- stack
- hosting target
- auth approach
- data model
- persistence layer
- environment variable list
- analytics/monitoring need
- backup/export need
- testing approach

Output:
- `ARCHITECTURE_SPEC.md`
- `ENVIRONMENT_MATRIX.md`

### 3. Build path selection
Van chooses one of three paths:
- Salvage: existing codebase is structurally sound enough to harden
- Rebuild: existing codebase is too compromised or dishonest to save cleanly
- Hybrid: preserve proven UI or domain logic, replace weak infrastructure

Output:
- `SALVAGE_VS_REBUILD_RECOMMENDATION.md`

### 4. Execution decomposition
Van breaks work into small implementation units with one owner each.
Recommended buckets:
- app shell / routing
- design system / UI primitives
- auth
- database / models
- domain services
- integrations
- QA fixes
- deployment
- documentation

Output:
- `TASK_BREAKDOWN.md`
- `DELIVERY_STATUS.json`

### 5. Build implementation
Van or Van’s subagents build in this order unless the project requires otherwise:
1. local run succeeds
2. routing and shell work
3. auth path works
4. data models and persistence work
5. primary user flows work
6. failure states work
7. polishing and packaging work
8. deploy preview works

### 6. Scrub pass before QA
Van must scrub the build before asking QA to review.

Base44 export scrub rule:
- Base44 scrub + Next.js conversion workflows are classified as SAFE LOCAL TRANSFORMATIONS.
- Van may read local project files, run static code scans, perform asset discovery, use escaped regex patterns, and use python3 inline parsing scripts for local file parsing without waiting for interactive Perry approval.
- This allowance only covers in-project local scanning/parsing. Escalate immediately if the workflow needs external network calls, writes outside project scope, or destructive commands.

Required scrub checklist:
- remove dead code and fake/demo placeholders
- remove dishonest claims and non-working CTAs
- remove unused integrations and secrets
- verify env vars are documented
- verify empty/loading/error states exist
- verify forms validate correctly
- verify responsive layouts on core breakpoints
- verify lint/build/typecheck results are captured
- verify all files/artifacts exist on disk

Output:
- `FINAL_SCRUB_CHECKLIST.md`
- `BUILD_EVIDENCE.md`

### 7. QA handoff
Van sends QA a clean handoff packet, not a vague message.

Required QA packet:
- project path
- branch or snapshot reference
- build command
- test command
- known caveats
- core flows to validate
- release blocker questions
- screenshots or route list

Output:
- `QA_HANDOFF_PACKET.md`

### 8. QA response handling
Van owns technical response to defects.
For each QA finding:
- classify severity: blocker / major / minor / note
- fix or rebut with evidence
- update release status

Output:
- `QA_RESPONSE_LOG.md`
- updated `DELIVERY_STATUS.json`

### 9. Nettie review packet
When QA is satisfied, Van delivers a decision-useful packet to Nettie.

Required contents:
- what was built
- what is working now
- what remains deferred
- deployment target/status
- risks and caveats
- artifact list
- recommendation: ready / almost ready / not ready

Output:
- `NETTIE_REVIEW_PACKET.md`

## Default artifact folder for each job
Recommended structure:
- `reports/INITIAL_SCOPE.md`
- `reports/BUILD_PLAN.md`
- `reports/ARCHITECTURE_SPEC.md`
- `reports/ENVIRONMENT_MATRIX.md`
- `reports/SALVAGE_VS_REBUILD_RECOMMENDATION.md`
- `reports/TASK_BREAKDOWN.md`
- `reports/FINAL_SCRUB_CHECKLIST.md`
- `reports/BUILD_EVIDENCE.md`
- `reports/QA_HANDOFF_PACKET.md`
- `reports/QA_RESPONSE_LOG.md`
- `reports/NETTIE_REVIEW_PACKET.md`
- `reports/DELIVERY_STATUS.json`

## Rules for asking Patrick for help
Patrick should not be asked for routine execution decisions.
Escalate only when one of these is true:
- product direction materially changes
- budget changes materially
- security risk is unresolved
- legal/compliance issue appears
- salvage vs rebuild tradeoff has major business impact
- QA and Van disagree on release readiness and Nettie needs principal sign-off

## Definition of autonomous success
Van is operating correctly when he can:
- take a routed build from Nettie
- create the scope and architecture artifacts himself
- request targeted QA/security input from Perry with a proper packet
- set up the environment and deployment path himself
- return a review-ready build packet without Patrick driving each step
