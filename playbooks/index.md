# Mission Control Playbook Index

System-level execution guides for ZIP-based and platform-export app projects.
All agents default to these playbooks unless explicitly overridden.

## base44/

| File | Purpose |
|------|---------|
| intake-checklist.md | Run at the start of every ZIP-based hardening project |
| dependency-scrub-checklist.md | Classify and remove platform-injected dependencies |
| qa-gate-template.md | QA pass structure before review candidate decision |
| typecheck-classification-template.md | Classify typecheck errors into risk buckets |
| review-candidate-template.md | Final GO / GO WITH CAVEATS / NO-GO decision template |

## apps/

| File | Purpose |
|------|---------|
| groceries-lessons-learned.md | Shared Groceries (Cartly) Phase 7 lessons |

## core/

| File | Purpose |
|------|---------|
| zip-intake-protocol.md | Controlling doctrine for all ZIP-based builds |
| sandbox-setup-standard.md | Standard sandbox directory structure and rules |
| project-ledger-standard.md | Ledger format and update discipline |

## Doctrine Rule

All ZIP-based builds must follow Mission Control playbooks unless explicitly overridden.

Required sequence for every ZIP-based project:
1. intake-checklist
2. dependency-scrub-checklist
3. qa-gate-template
4. typecheck-classification-template
5. review-candidate-template
