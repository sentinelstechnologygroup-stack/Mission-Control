# Middleware Hub — Architecture Decision Memo

Prepared for: Patrick Camacho
Prepared by: Hermes / Mission Control
Date: 2026-04-26

## Decision
Build the middleware hub, but *as a thin, opinionated control plane*, not as a general integration platform.

Use the current Teams/Zoho effort as the first production wedge and design-partner case study. Do **not** broaden into a multi-channel platform until chat/status, job ledger, and approval routing are stable in Mission Control.

## 1) Best-practice architecture

**Recommended shape:**
- **Ingress adapters** per channel: Telegram, Teams, Zoho, email, webhooks, web forms
- **Normalization layer** that converts every inbound message into one canonical `event`
- **Policy/validation layer** that checks auth, dedupe, schema, permissions, and required fields
- **Router/orchestrator** that maps events to jobs, agents, workflows, or human approvals
- **Ledger/audit layer** that stores immutable event + job state transitions
- **Egress adapters** that send a bounded response back to the source channel

**Key design rule:**
- Separate *event intake* from *job execution*.
- Never let a channel adapter create side effects directly.
- Always route through a canonical ledger record first.

**Best-practice principles:**
- webhook-first, event-driven, idempotent
- schema versioning from day one
- authn/authz per connector, per tenant, per action
- explicit retry/DLQ handling
- strict provenance (`source`, `actor`, `channel`, `tenant`, `correlation_id`)
- human approval as a first-class state, not an exception

## 2) MVP scope

**MVP should only include:**
- one canonical inbound event format
- one job ledger
- one router
- one approval/status response path
- 2 connectors max for first release:
  - Mission Control web UI/forms
  - Telegram *or* Teams, not both at once

**MVP excludes:**
- full multi-tenant routing
- arbitrary workflow designer
- complex SLA engine
- AI auto-actions without approval
- broad CRM sync beyond the specific wedge use case
- client-facing portal productization

**MVP success criteria:**
- every inbound action becomes a ledgered event
- every event is traceable to one owner and one next action
- every reply can be sent back to the originating channel
- no duplicated processing on retries

## 3) Event/job schema

**Canonical `event` fields:**
- `event_id`
- `event_type`
- `version`
- `source_channel`
- `source_system`
- `tenant_id`
- `external_message_id`
- `correlation_id`
- `conversation_id`
- `actor_id`
- `actor_type` (`human|bot|system`)
- `subject`
- `body`
- `attachments[]`
- `intent`
- `priority`
- `confidence`
- `permissions_required[]`
- `created_at`
- `received_at`
- `raw_payload_ref`
- `normalized_payload_ref`
- `dedupe_key`
- `signature_status`
- `status`

**Canonical `job` fields:**
- `job_id`
- `job_type`
- `owner`
- `supporting_owners[]`
- `source_event_id`
- `status` (`new|scoped|ready|running|blocked|waiting_approval|done|cancelled`)
- `stage`
- `priority`
- `risk_level`
- `decision_needed`
- `next_action`
- `due_at`
- `sla_class`
- `artifact_refs[]`
- `audit_trail[]`
- `retry_count`
- `resume_token`
- `created_at`
- `updated_at`

**Rule:** one event may create many jobs, but one job must always point back to one source event chain.

## 4) First Teams/Zoho wedge

### Exact trigger
- Teams message command in a configured Mission Control channel
- Recommended format: `/zoho task <task title> tomorrow at 10am about <context>`
- Trigger transport: Teams bot mention or slash command in the configured business channel

### Exact Zoho object
- Zoho CRM Task

### Exact Zoho action
- Create task
- Optional follow-on: update task when the operator approves a revision or status change

### Canonical event shape
Use one canonical event record before any Zoho side effect:

```json
{
  "eventId": "evt_generated_id",
  "source": "teams",
  "sourceChannel": "configured_channel_or_chat_id",
  "sourceUser": "requesting_user",
  "timestamp": "ISO-8601 timestamp",
  "intent": "zoho_task_create",
  "targetSystem": "zoho_crm",
  "targetObject": "task",
  "action": "create",
  "payload": {
    "taskTitle": "Follow up with ABC Dental",
    "dueDate": "parsed_due_date",
    "dueTime": "parsed_due_time",
    "relatedRecordType": "lead/contact/deal/account",
    "relatedRecordName": "ABC Dental",
    "notes": "about proposal",
    "priority": "normal"
  },
  "approvalRequired": true,
  "status": "pending_approval",
  "result": null,
  "error": null
}
```

### Approval/status return path back to Teams
- Mission Control creates a ledgered job and posts an approval request back into the originating Teams channel
- On approval, the connector worker executes the Zoho CRM task creation
- Result is returned to Teams as a concise confirmation reply
- Mission Control dashboard and job ledger retain the canonical event, approval step, and final status

### Minimum validation test
Prove the wedge end-to-end with one simulated Teams event:
1. Simulate the Teams command in the configured channel
2. Confirm the canonical event is created
3. Confirm intent classification resolves to `zoho_task_create`
4. Confirm a job ledger entry is created
5. Confirm the Zoho action is mocked or safely executed in test mode
6. Confirm the approval/status reply returns to Teams
7. Confirm failure states return a clean operator-facing error

### Wedge rule
Do not broaden beyond Teams + Zoho CRM Task until this exact flow is stable and visible in the ledger.

## 4) Safe support over time

Add channels in this order:
1. **Web UI / forms / webhook ingress**
2. **Email**
3. **Telegram**
4. **Teams**
5. **Zoho**
6. **Website forms and client systems**

**Safety requirements for every new connector:**
- explicit auth model and tenant boundaries
- replay protection and dedupe
- payload quarantine for malformed input
- safe defaults: read-only until verified
- permission mapping before execution permissions
- channel-specific rate limits
- PII logging rules
- audit evidence for every accepted action

**Connector-specific guidance:**
- **Telegram:** good for lightweight command/status; keep it command-limited and ledger-backed
- **Teams:** good for business users and internal coordination; require stricter identity mapping
- **Zoho:** treat as source-of-truth integration, not a chat surface; use stable API contracts
- **Email:** best for intake and notifications; keep parsing conservative
- **Webhooks:** best transport for partners and apps; validate signatures and schema strictly
- **Website forms:** safe as a controlled ingress UI; good for structured submissions and lead capture

## 5) Overbuild risks

**Highest risks:**
- building a platform before proving one workflow
- too many channels too early
- over-abstracting connector logic before schema stabilizes
- adding AI routing before deterministic routing is reliable
- pretending the system is “universal” before one operational vertical works
- coupling product ambition with integration sprawl

**What to avoid:**
- plugin marketplace too early
- workflow builder too early
- multi-tenant billing before one real customer path works
- “support everything” positioning before guardrails exist

## 6) Next 3 practical build steps after chat/status is stable

1. **Lock the canonical event/job contract**
   - define schema, statuses, idempotency keys, correlation IDs, and audit fields
2. **Build one connector end-to-end**
   - choose Telegram *or* Teams and prove intake → normalize → route → reply → ledger
3. **Add one business integration with a real value loop**
   - Zoho or email, but only one, and only for a concrete production workflow

## Strategic answer: should Patrick get his own Zoho access and pursue both tracks?

**Yes to Zoho access.**
Patrick should have his own Zoho access if the project depends on real configuration, testing, permissions, and customer-visible validation. Without direct access, the middleware design will stay abstract and slower.

**Yes to both tracks, but not equally.**
- **Track A: Teams/Zoho project** = immediate wedge and proof of value
- **Track B: broader middleware hub** = product line, but only after the wedge proves stable

**Recommendation:**
- pursue both, but in a **hub-first / wedge-second** structure
- use the Teams/Zoho project as the funded, concrete pilot
- extract reusable connector, schema, and ledger primitives from that pilot
- delay broad product marketing until two channels and one workflow are production-safe

## Pros / cons

**Pros**
- creates a reusable control plane
- converts one-off integrations into durable infrastructure
- strengthens auditability and permissioning
- supports future client systems without rework
- gives Mission Control a productizable architecture

**Cons**
- easy to overbuild
- connector maintenance becomes real operational burden
- more security and compliance surface area
- productization can distract from shipping the first valuable workflow

## Phased plan

**Phase 0 — stabilize Mission Control core**
- chat/status stable
- job ledger reliable
- routing and approvals trusted

**Phase 1 — wedge delivery**
- Teams/Zoho production pilot
- direct Zoho access for Patrick
- canonical event/job contract
- one connector pair fully operational

**Phase 2 — repeatable hub**
- add email + webhooks
- standardize adapter interface
- implement dedupe, retries, DLQ, and audit events

**Phase 3 — product line**
- add Telegram and website forms
- formalize tenant boundaries and connector governance
- package the hub as a product only after one or two paid/real deployments

## Bottom line

Build the middleware hub only if it remains a *disciplined, ledgered control plane*. Use the Teams/Zoho job as the first proof point. Give Patrick Zoho access. Do not market a broad product line until the core contract, one connector, and one real workflow are proven.
