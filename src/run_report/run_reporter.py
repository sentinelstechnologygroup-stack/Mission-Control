"""
Run Reporter — main entry point for the Mission Control Run Artifact Layer.

Generates a complete run bundle from a finished MissionControl execution.

Usage:
    from run_report import run_reporter
    paths = run_reporter.generate(mc, run_id="run_001", output_dir="./reports/run_001")
"""
from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, List, Optional

from .summary_builder import build_summary
from .trace_builder import build_trace
from .manifest_builder import build_manifest
from .delivery_builder import build_delivery


def generate(
    mc: Any,
    run_id: str,
    output_dir: str,
    root_task_id: Optional[str] = None,
    agent_outputs: Optional[Dict[str, Any]] = None,
    delivered_files: Optional[List[str]] = None,
) -> Dict[str, str]:
    """
    Generate a complete run artifact bundle.

    Parameters
    ----------
    mc              : MissionControl instance (post-run)
    run_id          : logical run identifier (e.g. "run_20260419_001")
    output_dir      : directory to write artifacts into (created if absent)
    root_task_id    : optional root task to anchor lineage graph
    agent_outputs   : optional dict of {agent_name: output} for summary/delivery
    delivered_files : optional list of file paths to include in final_delivery/

    Returns
    -------
    dict mapping artifact name → absolute file path
    """
    os.makedirs(output_dir, exist_ok=True)
    delivery_dir = os.path.join(output_dir, "final_delivery")
    os.makedirs(delivery_dir, exist_ok=True)

    qs = mc.get_queue_state()
    tasks: List[Dict[str, Any]] = []
    seen_task_ids: set[str] = set()

    if root_task_id:
        lineage = mc.get_task_graph(root_task_id)
        all_ids: List[str] = [root_task_id]
        if lineage.get("ok"):
            all_ids += lineage.get("child_task_ids") or []
        for tid in all_ids:
            if tid in seen_task_ids:
                continue
            t = mc.get_task(tid)
            if t.get("ok"):
                tasks.append(t)
                seen_task_ids.add(tid)
                children = mc.get_task_children(tid)
                if children.get("ok"):
                    for cid in children.get("children", {}).keys():
                        if cid in seen_task_ids:
                            continue
                        ct = mc.get_task(cid)
                        if ct.get("ok") and ct not in tasks:
                            tasks.append(ct)
                            seen_task_ids.add(cid)

    state = {
        "run_id":          run_id,
        "generated_at":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "queue_state":     qs,
        "tasks":           tasks,
        "root_task_id":    root_task_id,
        "agent_outputs":   agent_outputs or {},
        "delivered_files": delivered_files or [],
    }

    if root_task_id:
        state["lineage"] = mc.get_task_graph(root_task_id)

    builder_errors: List[str] = []

    try:
        summary_md = build_summary(state)
    except Exception as exc:
        builder_errors.append(f"summary_builder: {exc}")
        summary_md = (
            f"# Mission Control Run Report\n\n"
            f"**Run ID:** `{run_id}`  \n"
            f"**Generated:** {state.get('generated_at', '')}  \n"
            f"**Outcome:** PARTIAL  \n\n"
            f"Artifact generation fell back to a minimal summary because the"
            f" summary builder failed: `{exc}`\n"
        )

    try:
        trace_dict = build_trace(state, mc=mc, root_task_id=root_task_id)
    except Exception as exc:
        builder_errors.append(f"trace_builder: {exc}")
        trace_dict = {
            "schema_version": "1.0",
            "run_id": run_id,
            "generated_at": state.get("generated_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
            "queue_summary": state.get("queue_state", {}),
            "tasks": state.get("tasks", []),
            "failover_events": [],
            "lineage": state.get("lineage"),
            "artifact_generation_errors": builder_errors[:],
        }

    try:
        manifest = build_manifest(state, output_dir)
    except Exception as exc:
        builder_errors.append(f"manifest_builder: {exc}")
        manifest = {
            "schema_version": "1.0",
            "run_id": run_id,
            "generated_at": state.get("generated_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())),
            "output_dir": output_dir,
            "file_count": 0,
            "files": [],
            "logical_artifacts": [],
            "artifact_generation_errors": builder_errors[:],
        }
    if builder_errors:
        manifest.setdefault("artifact_generation_errors", builder_errors[:])

    summary_path  = os.path.join(output_dir, "run_summary.md")
    trace_path    = os.path.join(output_dir, "run_trace.json")
    manifest_path = os.path.join(output_dir, "artifacts_manifest.json")

    with open(summary_path, "w", encoding="utf-8") as f:
        f.write(summary_md)

    with open(trace_path, "w", encoding="utf-8") as f:
        json.dump(trace_dict, f, indent=2, default=str)

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)

    build_delivery(state, delivery_dir)

    manifest["files"].extend(["run_summary.md", "run_trace.json", "artifacts_manifest.json"])
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, default=str)

    return {
        "run_summary.md":          os.path.abspath(summary_path),
        "run_trace.json":          os.path.abspath(trace_path),
        "artifacts_manifest.json": os.path.abspath(manifest_path),
        "final_delivery":          os.path.abspath(delivery_dir),
    }
