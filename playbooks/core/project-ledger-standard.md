# Project Ledger Standard

Format and update discipline for all Mission Control project state ledgers.

## Location
`/home/patrick/mission-control/sandboxes/<project-slug>/shared-ledger/project-state-ledger.md`

## When to create
Create at project intake, before Phase 0 begins.

## Required header fields
- Project:
- Artifact source:
- Start date:
- Current phase:
- Lifecycle stage:
- V1 pillars:
- Non-redesign rule:
- Brand/name status:

## Required sections

### Current State
- complete:
- in_progress:
- blocked:
- waiting_on:

### Phase Log
One entry per completed phase. Each entry must include:
- phase name
- date completed
- summary of what changed
- commands run and results
- what passed
- what failed or was deferred
- what was learned
- what was promoted to playbook

### Next Actions
Ordered list of immediate next steps.

### Decisions Needed
Open decisions requiring Patrick or stakeholder input.

### Risks
Active risks. Each entry:
- risk description
- severity (low / medium / high / critical)
- mitigation or owner

### Dependencies
External blockers or hard requirements.

### Latest Executive Note
Most recent Nettie or Van summary note.

## Update rules
- Update the ledger at the end of every phase, not just at project close
- Do not rely on chat history as the source of truth
- Record decisions in the ledger at the time they are made
- Record deferred work explicitly — do not leave it in chat
- Record tool limitations and QA caveats in the phase log
- If a phase is blocked, record the blocker before stopping work

## Promotion rule
If a phase produces a reusable pattern, checklist, or template:
- note it in the phase log
- promote it to `/home/patrick/mission-control/playbooks/`
- do not leave reusable knowledge only in project-specific files
