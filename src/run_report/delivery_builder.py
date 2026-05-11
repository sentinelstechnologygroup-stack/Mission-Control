"""
Delivery builder — assembles final_delivery/ package from run state.
"""
from __future__ import annotations

import json
import os
import shutil
import time
from typing import Any, Dict, List, Optional


def build_delivery(state: Dict[str, Any], delivery_dir: str) -> None:
    """
    Assemble a final_delivery/ package.

    Writes:
      DELIVERY_MANIFEST.json  — metadata + file listing
      agent_outputs.json      — raw agent output dict
      <agent>_output.json     — per-agent output file for each agent that ran
    """
    os.makedirs(delivery_dir, exist_ok=True)

    run_id       = state.get("run_id", "unknown")
    generated_at = state.get("generated_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    agent_outputs = state.get("agent_outputs", {})
    tasks         = state.get("tasks", [])

    written: List[str] = []

    outputs_path = os.path.join(delivery_dir, "agent_outputs.json")
    with open(outputs_path, "w", encoding="utf-8") as f:
        json.dump(agent_outputs, f, indent=2, default=str)
    written.append("agent_outputs.json")

    for agent_name, output in agent_outputs.items():
        fname = f"{agent_name.lower()}_output.json"
        fpath = os.path.join(delivery_dir, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump({"agent": agent_name, "output": output}, f, indent=2, default=str)
        written.append(fname)

    delivered_files = state.get("delivered_files", [])
    for src in delivered_files:
        if os.path.isfile(src):
            dst = os.path.join(delivery_dir, os.path.basename(src))
            shutil.copy2(src, dst)
            written.append(os.path.basename(src))

    manifest = {
        "schema_version": "1.0",
        "run_id":         run_id,
        "generated_at":   generated_at,
        "files":          written,
        "task_count":     len(tasks),
        "agents":         list(agent_outputs.keys()),
    }
    manifest_path = os.path.join(delivery_dir, "DELIVERY_MANIFEST.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)
