# Mission Control Agent File System Standard

Status: Active standard

## Core anatomy
- agent.md — public agent summary and quick reference
- AGENTS.md — runtime/Codex instruction layer
- dependencies.md — tools, skills, repo access, MCP/APIs, linked agents
- handoffs.md — inbound/outbound handoff rules
- IDENTITY.md — role, title, domain, authority, behavioral identity
- LOGIC.md — routing, escalation, rejection, acceptance, decision rules
- MEMORY.md — continuity, lessons, stable operating notes
- ownership.md — domain ownership and hard boundaries
- prompt.md — reusable core agent prompt
- SOUL.md — values, judgment style, personality, failure tendencies, improvement commitments
- TASKS.md — active responsibilities, recurring duties, task templates
- TOOLS.md — allowed tools, blocked tools, permission limits, safe-usage rules

## Governance files when applicable
- APP_WEBSITE_DELIVERY_RUNBOOK.md
- AUTOMATION_POLICY.md
- autonomy_policy.md
- behavior.md
- DELEGATION.md
- DOMAIN_OWNERSHIP.md
- FIREBASE_FIRESTORE_SETUP_RUNBOOK.md
- GENERIC_SCRIPT_EXECUTION_RUNBOOK.md
- ROUTING_AND_READINESS_VALIDATION_RUNBOOK.md
- rules.md

## Runtime usage rule
These files are not decorative. Mission Control must load and expose:
- identity
- ownership
- tools/permissions
- handoffs
- memory summary
- task summary
- AGENTS.md/runtime instruction summary

## Codex custom agent rule
Custom agent TOML stays concise and points to the full anatomy folder rather than embedding large memory/prompt blocks.

## Skills rule
Use skills for reusable workflows, not agent identity.
