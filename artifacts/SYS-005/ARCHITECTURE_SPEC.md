# SYS-005 Architecture Spec

Flow:
pending → active → execute → validate → completed

Failure paths:
execute fail → retry
validate fail → retry
retry exhausted → blocked

Validation gate:
python3 scripts/validate_task_result.py tmp/task_result.json

Exit code handling:
0 → success
1–5 → validation failure
9 → system error
