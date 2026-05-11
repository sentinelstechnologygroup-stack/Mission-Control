"""
Trace builder — produces run_trace.json from run state.
"""
from __future__ import annotations

import time
from typing import Any, Dict, List, Optional


def build_trace(
    state: Dict[str, Any],
    mc: Optional[Any] = None,
    root_task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build a machine-readable execution trace dict.

    Includes per-task timing, provider provenance, failover events,
    and lineage edges if root_task_id is supplied.
    """
    run_id       = state.get("run_id", "unknown")
    generated_at = state.get("generated_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    qs           = state.get("queue_state", {})
    tasks        = state.get("tasks", [])

    trace: Dict[str, Any] = {
        "schema_version": "1.0",
        "run_id":         run_id,
        "generated_at":   generated_at,
        "queue_summary":  qs,
        "tasks":          [],
        "failover_events": [],
        "lineage":        None,
    }

    for t in tasks:
        ar = t.get("agent_result") or {}
        task_trace = {
            "task_id":      t.get("task_id"),
            "agent_name":   t.get("agent_name"),
            "status":       t.get("status"),
            "priority":     t.get("priority"),
            "attempts":     t.get("attempts"),
            "enqueued_ts":  t.get("enqueued_ts"),
            "started_ts":   t.get("started_ts"),
            "finished_ts":  t.get("finished_ts"),
            "error":        t.get("error"),
            "parent_task_id": t.get("parent_task_id"),
            "child_task_ids": t.get("child_task_ids") or [],
            "provider":       ar.get("provider"),
            "failover_from":  t.get("failover_from") or ar.get("failover_from"),
            "failover_to":    t.get("failover_to"),
            "execution_ms":   ar.get("execution_ms"),
        }
        trace["tasks"].append(task_trace)

        if task_trace["failover_from"]:
            trace["failover_events"].append({
                "task_id":       t.get("task_id"),
                "agent_name":    t.get("agent_name"),
                "failed_provider":  task_trace["failover_from"],
                "used_provider":    task_trace["failover_to"] or task_trace["provider"],
                "finished_ts":      t.get("finished_ts"),
            })

    if root_task_id and mc is not None:
        lineage = mc.get_task_graph(root_task_id)
        if lineage.get("ok"):
            trace["lineage"] = lineage

    return trace
