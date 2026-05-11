#!/bin/bash

set -u
set -o pipefail

BASE="$HOME/mission-control"
PENDING="$BASE/queue/pending.json"
ACTIVE="$BASE/queue/active.json"
COMPLETED="$BASE/queue/completed.json"
BLOCKED="$BASE/queue/blocked.json"
LOG="$BASE/logs/system.log"
TMP_DIR="$BASE/tmp"
RESULT_FILE="$TMP_DIR/task_result.json"
NOTE_FILE="$TMP_DIR/ollama-task-note.json"
STATE_FILE="$TMP_DIR/queue_runner_state.json"
MODEL_NOTE_PID_FILE="$TMP_DIR/model_note.pid"
MODEL_NOTE_ERROR_LOG="$TMP_DIR/model_note_error.log"
MAX_ATTEMPTS=2
ENABLE_NOTES="${MISSION_CONTROL_ENABLE_NOTES:-false}"
MODEL_TIMEOUT_SECONDS=3

mkdir -p "$BASE/queue" "$BASE/logs" "$TMP_DIR"

for queue_file in "$PENDING" "$ACTIVE" "$COMPLETED" "$BLOCKED"; do
  if [ ! -s "$queue_file" ]; then
    printf '[]\n' > "$queue_file"
  fi
done

if [ ! -s "$STATE_FILE" ]; then
  printf '{}\n' > "$STATE_FILE"
fi

log_event() {
  local level="$1"
  local event="$2"
  local task_id="$3"
  local message="$4"
  printf '%s level=%s event=%s task_id=%s message=%s\n' \
    "$(date -Iseconds)" "$level" "$event" "$task_id" "$message" >> "$LOG"
}

run_model_note_async() {
  local task_id="$1"
  local task_type="$2"
  local task_desc="$3"

  if [ "$ENABLE_NOTES" != "true" ]; then
    log_event "INFO" "MODEL_NOTE_SKIPPED" "$task_id" "MISSION_CONTROL_ENABLE_NOTES is not true"
    return 0
  fi

  (
    exec 1>/dev/null 2>>"$MODEL_NOTE_ERROR_LOG"

    TASK_ID="$task_id" TASK_TYPE="$task_type" TASK_DESC="$task_desc" NOTE_FILE="$NOTE_FILE" python3 - <<'PY'
import json
import os
import tempfile
from pathlib import Path

note_path = Path(os.environ['NOTE_FILE'])
note_path.parent.mkdir(parents=True, exist_ok=True)
prompt = f"""Return one short sentence only.
Task ID: {os.environ['TASK_ID']}
Task Type: {os.environ['TASK_TYPE']}
Task Description: {os.environ['TASK_DESC']}
What was done?"""
payload = {
    'model': 'mistral:7b',
    'prompt': prompt,
    'stream': False,
    'options': {
        'num_predict': 40,
        'temperature': 0,
    },
}
with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=str(note_path.parent), delete=False) as handle:
    json.dump(payload, handle)
    handle.write('\n')
    temp_name = handle.name
os.replace(temp_name, note_path)
PY
    NOTE_PREP_EXIT=$?

    if [ "$NOTE_PREP_EXIT" -ne 0 ]; then
      printf 'MODEL_NOTE_PREP_ERROR task_id=%s exit=%s\n' "$task_id" "$NOTE_PREP_EXIT" >&2
      log_event "WARN" "MODEL_NOTE_FAILURE" "$task_id" "Failed to prepare advisory note payload pid=$BASHPID exit_code=$NOTE_PREP_EXIT"
      exit "$NOTE_PREP_EXIT"
    fi

    MODEL_OUTPUT=$(curl -s --max-time "$MODEL_TIMEOUT_SECONDS" http://localhost:11434/api/generate \
      -H "Content-Type: application/json" \
      -d @"$NOTE_FILE")
    MODEL_EXIT=$?

    if [ "$MODEL_EXIT" -ne 0 ] || [ -z "$MODEL_OUTPUT" ]; then
      log_event "WARN" "MODEL_NOTE_TIMEOUT" "$task_id" "Advisory model timed out or failed within ${MODEL_TIMEOUT_SECONDS}s pid=$BASHPID"
      exit 0
    fi

    PARSED_NOTE=$(MODEL_OUTPUT="$MODEL_OUTPUT" python3 - <<'PY'
import json
import os
payload_text = os.environ['MODEL_OUTPUT']
try:
    payload = json.loads(payload_text)
except json.JSONDecodeError:
    print('MODEL_NOTE_UNAVAILABLE')
    raise SystemExit(0)
response = payload.get('response', 'MODEL_NOTE_UNAVAILABLE')
response = response.strip() if isinstance(response, str) else 'MODEL_NOTE_UNAVAILABLE'
print(response or 'MODEL_NOTE_UNAVAILABLE')
PY
)
    PARSE_EXIT=$?

    if [ "$PARSE_EXIT" -ne 0 ]; then
      printf 'MODEL_NOTE_PARSE_ERROR task_id=%s exit=%s\n' "$task_id" "$PARSE_EXIT" >&2
      log_event "WARN" "MODEL_NOTE_FAILURE" "$task_id" "Failed to parse advisory model response pid=$BASHPID exit_code=$PARSE_EXIT"
      exit "$PARSE_EXIT"
    fi

    log_event "INFO" "MODEL_NOTE_SUCCESS" "$task_id" "$PARSED_NOTE pid=$BASHPID"
    exit 0
  ) &

  local note_pid=$!
  printf 'pid=%s task_id=%s\n' "$note_pid" "$task_id" > "$MODEL_NOTE_PID_FILE"
  log_event "INFO" "MODEL_NOTE_PID" "$task_id" "Async advisory process started pid=$note_pid"

  return 0
}

log_event "INFO" "runner_start" "NA" "Queue runner started"

COUNT=$(python3 - "$PENDING" <<'PY'
import json
import sys
from pathlib import Path
path = Path(sys.argv[1])
print(len(json.loads(path.read_text(encoding='utf-8'))))
PY
)

if [ "$COUNT" -eq 0 ]; then
  log_event "INFO" "no_pending_tasks" "NA" "No pending tasks"
  echo "[QUEUE] No pending tasks"
  exit 0
fi

TASK_PAYLOAD=$(python3 - "$PENDING" "$ACTIVE" "$STATE_FILE" <<'PY'
import datetime
import json
import os
import sys
import tempfile
from pathlib import Path

def atomic_write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=str(path.parent), delete=False) as handle:
        json.dump(payload, handle, indent=2)
        handle.write('\n')
        temp_name = handle.name
    os.replace(temp_name, path)

pending_path = Path(sys.argv[1])
active_path = Path(sys.argv[2])
state_path = Path(sys.argv[3])
pending = json.loads(pending_path.read_text(encoding='utf-8'))
active = json.loads(active_path.read_text(encoding='utf-8'))
state = json.loads(state_path.read_text(encoding='utf-8'))

if not pending:
    raise SystemExit(20)

task = pending.pop(0)
task_id = str(task.get('task_id', 'UNKNOWN'))
now = datetime.datetime.now().isoformat()
task['status'] = 'active'
task['started_at'] = now
active.append(task)

state_entry = state.get(task_id, {})
attempt_count = int(state_entry.get('attempt_count', 0)) + 1
state[task_id] = {
    'attempt_count': attempt_count,
    'last_started_at': now,
    'last_status': 'active',
}

atomic_write(pending_path, pending)
atomic_write(active_path, active)
atomic_write(state_path, state)
print(json.dumps({'task': task, 'attempt_count': attempt_count}))
PY
)
MOVE_EXIT=$?

if [ "$MOVE_EXIT" -ne 0 ] || [ -z "$TASK_PAYLOAD" ]; then
  log_event "ERROR" "activate_failed" "NA" "Failed to move pending task to active"
  echo "[QUEUE] Failed to activate task"
  exit 9
fi

TASK_JSON=$(TASK_PAYLOAD="$TASK_PAYLOAD" python3 - <<'PY'
import json
import os
print(json.dumps(json.loads(os.environ['TASK_PAYLOAD'])['task']))
PY
)
TASK_ID=$(TASK_PAYLOAD="$TASK_PAYLOAD" python3 - <<'PY'
import json
import os
print(json.loads(os.environ['TASK_PAYLOAD'])['task'].get('task_id', 'UNKNOWN'))
PY
)
TASK_TYPE=$(TASK_PAYLOAD="$TASK_PAYLOAD" python3 - <<'PY'
import json
import os
print(json.loads(os.environ['TASK_PAYLOAD'])['task'].get('type', 'UNKNOWN'))
PY
)
TASK_DESC=$(TASK_PAYLOAD="$TASK_PAYLOAD" python3 - <<'PY'
import json
import os
print(json.loads(os.environ['TASK_PAYLOAD'])['task'].get('description', ''))
PY
)
ATTEMPT_COUNT=$(TASK_PAYLOAD="$TASK_PAYLOAD" python3 - <<'PY'
import json
import os
print(int(json.loads(os.environ['TASK_PAYLOAD'])['attempt_count']))
PY
)

log_event "INFO" "task_activated" "$TASK_ID" "Moved task to active (attempt $ATTEMPT_COUNT/$MAX_ATTEMPTS)"

TASK_JSON="$TASK_JSON" RESULT_FILE="$RESULT_FILE" python3 - <<'PY'
import json
import os
import tempfile
from pathlib import Path

task = json.loads(os.environ['TASK_JSON'])
result_path = Path(os.environ['RESULT_FILE'])
result_path.parent.mkdir(parents=True, exist_ok=True)
payload = {
    'id': task.get('task_id', ''),
    'status': 'completed',
    'result': str(task.get('description', '')).strip(),
}
with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=str(result_path.parent), delete=False) as handle:
    json.dump(payload, handle, indent=2)
    handle.write('\n')
    temp_name = handle.name
os.replace(temp_name, result_path)
PY
RESULT_WRITE_EXIT=$?

transition_failure() {
  local failure_kind="$1"
  local failure_code="$2"
  local failure_message="$3"
  local target_status="pending"
  local event_name="task_requeued"
  local exit_code="$failure_code"

  if [ "$ATTEMPT_COUNT" -ge "$MAX_ATTEMPTS" ]; then
    target_status="blocked"
    event_name="task_blocked"
  fi

  TASK_JSON="$TASK_JSON" \
  TARGET_STATUS="$target_status" \
  FAILURE_KIND="$failure_kind" \
  FAILURE_CODE="$failure_code" \
  FAILURE_MESSAGE="$failure_message" \
  PENDING_PATH="$PENDING" \
  ACTIVE_PATH="$ACTIVE" \
  BLOCKED_PATH="$BLOCKED" \
  STATE_PATH="$STATE_FILE" \
  python3 - <<'PY'
import datetime
import json
import os
import tempfile
from pathlib import Path

def atomic_write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=str(path.parent), delete=False) as handle:
        json.dump(payload, handle, indent=2)
        handle.write('\n')
        temp_name = handle.name
    os.replace(temp_name, path)

def match_task(candidate, target):
    return (
        candidate.get('task_id') == target.get('task_id')
        and candidate.get('started_at') == target.get('started_at')
    )

target_task = json.loads(os.environ['TASK_JSON'])
pending_path = Path(os.environ['PENDING_PATH'])
active_path = Path(os.environ['ACTIVE_PATH'])
blocked_path = Path(os.environ['BLOCKED_PATH'])
state_path = Path(os.environ['STATE_PATH'])
pending = json.loads(pending_path.read_text(encoding='utf-8'))
active = json.loads(active_path.read_text(encoding='utf-8'))
blocked = json.loads(blocked_path.read_text(encoding='utf-8'))
state = json.loads(state_path.read_text(encoding='utf-8'))
remaining_active = []
selected = None
for candidate in active:
    if selected is None and match_task(candidate, target_task):
        selected = candidate
    else:
        remaining_active.append(candidate)
if selected is None:
    raise SystemExit('Active task not found for failure transition')
selected['updated_at'] = datetime.datetime.now().isoformat()
task_id = str(selected.get('task_id', 'UNKNOWN'))
state_entry = state.get(task_id, {})
state_entry['last_status'] = os.environ['TARGET_STATUS']
state_entry['last_error_kind'] = os.environ['FAILURE_KIND']
state_entry['last_error_code'] = int(os.environ['FAILURE_CODE'])
state_entry['last_error_message'] = os.environ['FAILURE_MESSAGE']
state_entry['updated_at'] = datetime.datetime.now().isoformat()
state[task_id] = state_entry
if os.environ['TARGET_STATUS'] == 'pending':
    selected['status'] = 'pending'
    pending.insert(0, selected)
    atomic_write(pending_path, pending)
elif os.environ['TARGET_STATUS'] == 'blocked':
    selected['status'] = 'blocked'
    selected['blocked_at'] = datetime.datetime.now().isoformat()
    blocked.append(selected)
    atomic_write(blocked_path, blocked)
else:
    raise SystemExit(f"Unknown target status: {os.environ['TARGET_STATUS']}")
atomic_write(active_path, remaining_active)
atomic_write(state_path, state)
PY
  TRANSITION_EXIT=$?

  if [ "$TRANSITION_EXIT" -ne 0 ]; then
    log_event "ERROR" "failure_transition_error" "$TASK_ID" "Failed to persist $failure_kind handling"
    echo "[QUEUE] Failed to persist failure state for $TASK_ID"
    exit 9
  fi

  log_event "ERROR" "$event_name" "$TASK_ID" "$failure_message"
  echo "[QUEUE] $target_status $TASK_ID"
  exit "$exit_code"
}

if [ "$RESULT_WRITE_EXIT" -ne 0 ]; then
  log_event "ERROR" "result_write_failed" "$TASK_ID" "Failed to write $RESULT_FILE"
  transition_failure "execute_failure" 9 "Execution failed while writing result payload"
fi

VALIDATION_OUTPUT=$(python3 "$BASE/scripts/validate_task_result.py" "$RESULT_FILE" 2>&1)
VALIDATION_EXIT=$?
log_event "INFO" "validation_result" "$TASK_ID" "$VALIDATION_OUTPUT"

if [ "$VALIDATION_EXIT" -ne 0 ]; then
  transition_failure "validation_failure" "$VALIDATION_EXIT" "$VALIDATION_OUTPUT"
fi

TASK_JSON="$TASK_JSON" RESULT_FILE="$RESULT_FILE" ACTIVE_PATH="$ACTIVE" COMPLETED_PATH="$COMPLETED" STATE_PATH="$STATE_FILE" python3 - <<'PY'
import datetime
import json
import os
import tempfile
from pathlib import Path

def atomic_write(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=str(path.parent), delete=False) as handle:
        json.dump(payload, handle, indent=2)
        handle.write('\n')
        temp_name = handle.name
    os.replace(temp_name, path)

def match_task(candidate, target):
    return (
        candidate.get('task_id') == target.get('task_id')
        and candidate.get('started_at') == target.get('started_at')
    )

target_task = json.loads(os.environ['TASK_JSON'])
result_payload = json.loads(Path(os.environ['RESULT_FILE']).read_text(encoding='utf-8'))
active_path = Path(os.environ['ACTIVE_PATH'])
completed_path = Path(os.environ['COMPLETED_PATH'])
state_path = Path(os.environ['STATE_PATH'])
active = json.loads(active_path.read_text(encoding='utf-8'))
completed = json.loads(completed_path.read_text(encoding='utf-8'))
state = json.loads(state_path.read_text(encoding='utf-8'))
remaining_active = []
selected = None
for candidate in active:
    if selected is None and match_task(candidate, target_task):
        selected = candidate
    else:
        remaining_active.append(candidate)
if selected is None:
    raise SystemExit('Active task not found for completion transition')
selected['status'] = 'completed'
selected['completed_at'] = datetime.datetime.now().isoformat()
selected['result'] = result_payload.get('result')
completed.append(selected)
task_id = str(selected.get('task_id', 'UNKNOWN'))
state_entry = state.get(task_id, {})
state_entry['last_status'] = 'completed'
state_entry['updated_at'] = datetime.datetime.now().isoformat()
state[task_id] = state_entry
atomic_write(active_path, remaining_active)
atomic_write(completed_path, completed)
atomic_write(state_path, state)
PY
COMPLETE_EXIT=$?

if [ "$COMPLETE_EXIT" -ne 0 ]; then
  log_event "ERROR" "complete_transition_failed" "$TASK_ID" "Failed to move validated task to completed"
  echo "[QUEUE] Failed to complete $TASK_ID"
  exit 9
fi

log_event "INFO" "task_completed" "$TASK_ID" "Validation passed and task moved to completed"
log_event "INFO" "runner_cycle_done" "$TASK_ID" "Queue cycle complete"
run_model_note_async "$TASK_ID" "$TASK_TYPE" "$TASK_DESC"
echo "[QUEUE] Completed $TASK_ID"
exit 0
