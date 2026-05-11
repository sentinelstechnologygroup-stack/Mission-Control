#!/bin/bash

TASK_FILE="queue/pending.json"
LOG_FILE="logs/system.log"
PAYLOAD_FILE="/tmp/ollama-task.json"

mkdir -p logs

echo "[RUN] Starting FAST task execution" >> "$LOG_FILE"

python3 - <<'PY'
import json

task_file = "queue/pending.json"
payload_file = "/tmp/ollama-task.json"

tasks = json.load(open(task_file))
task = tasks[0] if tasks else {}

prompt = (
    "Return ONLY valid JSON.\n"
    "No explanation. No markdown.\n\n"
    "{\n"
    "  \"task_id\": \"...\",\n"
    "  \"type\": \"...\",\n"
    "  \"summary\": \"...\"\n"
    "}\n\n"
    f"TASK_ID: {task.get('task_id')}\n"
    f"TYPE: {task.get('type')}\n"
    f"DESCRIPTION: {task.get('description')}\n"
)

payload = {
    "model": "mistral:7b",
    "prompt": prompt,
    "stream": False,
    "options": {
        "num_predict": 80,
        "temperature": 0
    }
}

json.dump(payload, open(payload_file, "w"))
PY

echo "[RUN] Sending request..." >> "$LOG_FILE"

RAW=$(curl -s --max-time 90 http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d @"$PAYLOAD_FILE")

echo "[DEBUG_RAW]" >> "$LOG_FILE"
echo "$RAW" >> "$LOG_FILE"

# Extract response field
CLEAN=$(echo "$RAW" | python3 -c '
import sys, json
data=json.load(sys.stdin)
resp=data.get("response","")

# Try parse directly
try:
    obj=json.loads(resp)
    print(json.dumps(obj, indent=2))
except:
    # Try fix escaped JSON
    try:
        fixed=resp.replace("\\n","\n").replace("\\\"","\"")
        obj=json.loads(fixed)
        print(json.dumps(obj, indent=2))
    except:
        print("PARSE_ERROR:", resp)
')

echo "[RESULT]" >> "$LOG_FILE"
echo "$CLEAN" >> "$LOG_FILE"

echo "[RUN] Task complete" >> "$LOG_FILE"
