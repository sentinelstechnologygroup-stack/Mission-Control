# Middleware Hub Wedge Checklist

Status
- Draft implementation checklist
- Applies to the first Teams/Zoho control-plane wedge only
- Keep the hub thin, opinionated, and ledgered

## Wedge definition
- Trigger: Teams slash command or bot mention in a configured channel
- Object: Zoho CRM Task
- Action: Create task
- Canonical event: one event record, one ledger entry, one router decision, one approval/status path

## Preflight
- Confirm the Teams channel is configured
- Confirm the requesting user is recognized
- Confirm the command maps to `zoho_task_create`
- Confirm approval is required when the action is side-effecting
- Confirm the request is written to the canonical event ledger before execution

## Execution path
1. Ingest the Teams message
2. Normalize it into the canonical event format
3. Create a ledger/job record
4. Route it to the Zoho task worker
5. Request operator approval if required
6. Execute the Zoho CRM task creation in safe test mode or real mode as configured
7. Write the result and error state back to the ledger
8. Return a concise confirmation to Teams

## Validation
- Simulate one Teams command
- Verify the canonical event fields are present
- Verify the intent resolves to `zoho_task_create`
- Verify a ledger entry exists
- Verify the Zoho action is mocked or safely executed
- Verify the response returns to Teams
- Verify failure responses are operator-readable and non-destructive

## Stop conditions
- Do not add extra connectors before this wedge is stable
- Do not build a generic integration marketplace
- Do not skip the ledger just because the Teams trigger is simple
- Do not let the connector write directly without router/approval visibility
