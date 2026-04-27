# ZIP Intake Protocol

Controlling doctrine for all ZIP-based and platform-export app builds.

## When this applies
Use whenever a project begins from a ZIP export, platform-generated source, or downloaded app archive.

## Step 1 — Receive and store the artifact
- Accept the ZIP into a controlled location, not Downloads
- Place under `/home/patrick/apps/<project-slug>/workspace/source/`
- Do not extract into a shared or temporary directory
- Record the source artifact path in the project ledger immediately

## Step 2 — Create the sandbox
- Follow the sandbox setup standard
- Create `shared-ledger/` and department artifact folders before any work begins
- The sandbox must exist before the first phase starts

## Step 3 — Initialize the project ledger
- Follow the project ledger standard
- Record: project name, artifact source, start date, V1 pillars, non-redesign rule
- Record the phase as INTAKE

## Step 4 — Run Phase 0 commands
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck` if available
- Record pass/fail for each in the ledger

## Step 5 — Verify local runtime
- Confirm actual app URL and port
- Fingerprint the served HTML
- Do not trust an unlabeled Vite port
- Do not proceed to hardening if the app does not boot

## Step 6 — Produce intake outputs
Before any hardening begins, produce:
- Intake report
- Route map
- Platform dependency map
- Risk register (initial)
- Department ownership handoff

## Step 7 — Lock scope
Before Phase 1:
- Confirm non-redesign rule is recorded
- Confirm V1 pillars are recorded
- Confirm brand/name status is recorded if placeholder names are present
- Confirm phase sequence is agreed

## Rules
- Do not begin hardening without a completed intake
- Do not skip Phase 0 commands even if the app looks clean
- Do not trust platform-injected behavior until the dependency map is complete
- Do not call intake complete until all six outputs exist
