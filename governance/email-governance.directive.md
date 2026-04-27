EMAIL GOVERNANCE DIRECTIVE — DEPARTMENT HEAD REPORTING + NETTIE EXECUTIVE REPORTING

Status
- Permanent system rule
- Operator-first internal email governance for Mission Control
- Backed by code in src/governance/email_governance.js and wired into Dana's report pipeline

Primary rule
- All automated internal reports default to:
  - SentinelsTechnologyGroup@gmail.com
  - Patrick@SentinelsDesignLab.com
- Missing either primary recipient blocks send, logs failure, and raises a Nettie alert artifact.

Authorized senders
- Nettie
- Dana
- Van
- Perry
- Funboy
- Other department heads/sub-agents only when explicitly assigned through Mission Control governance

Subject rule
- Required format: [Sender] Report Type — Project/System — Status or Hook
- Generic or vague subjects are rejected by enforcement code before send.

Content contract
Every report email must include:
- sender
- report type
- system/project/subject
- current status
- key findings
- blockers or risks
- next action / next milestone
- evidence-backed summary
- run_id / artifact reference when applicable
- attachment list

Audit rule
Every automated send must produce a persistent send log containing:
- recipients
- subject
- attachments
- send_result
- timestamp
- template_used
- canonical_report_pack_root when applicable
- body_source
- payload_path when applicable
- sender identity

Failure rule
Failed sends must:
- log failure
- record send_result = FAIL
- capture error details
- append a Nettie alert artifact
- keep the failure visible for operator review

Nettie digest rule
- Department heads keep domain-specific reporting.
- Nettie sits above them as the executive consolidation layer.
- Every governed report appends a digest handoff record to Nettie's executive digest queue.
- Alert-grade failures append to Nettie's alert queue.
