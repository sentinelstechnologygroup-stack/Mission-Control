"""
Manifest builder — produces artifacts_manifest.json from run state.
"""
from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional


def build_manifest(
    state: Dict[str, Any],
    output_dir: str,
    extra_files: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Build an artifact inventory manifest.

    Walks output_dir for any files already written and records their
    metadata. Includes agent_outputs from state as logical artifacts.
    """
    run_id       = state.get("run_id", "unknown")
    generated_at = state.get("generated_at", time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))

    file_artifacts: List[Dict[str, Any]] = []

    if os.path.isdir(output_dir):
        for dirpath, _dirs, filenames in os.walk(output_dir):
            for fname in sorted(filenames):
                fpath = os.path.join(dirpath, fname)
                rel   = os.path.relpath(fpath, output_dir)
                try:
                    size = os.path.getsize(fpath)
                    mtime = os.path.getmtime(fpath)
                except OSError:
                    size = 0
                    mtime = 0
                file_artifacts.append({
                    "path":       rel,
                    "size_bytes": size,
                    "mtime":      time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(mtime)),
                })

    if extra_files:
        for fpath in extra_files:
            if os.path.isfile(fpath):
                size = os.path.getsize(fpath)
                mtime = os.path.getmtime(fpath)
                file_artifacts.append({
                    "path":       fpath,
                    "size_bytes": size,
                    "mtime":      time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(mtime)),
                })

    agent_outputs = state.get("agent_outputs", {})
    logical_artifacts: List[Dict[str, Any]] = []
    for agent_name, output in agent_outputs.items():
        if isinstance(output, dict):
            arts = output.get("artifacts") or output.get("components") or output.get("plan") or []
            logical_artifacts.append({
                "agent":     agent_name,
                "artifacts": arts if isinstance(arts, list) else [str(arts)],
            })

    return {
        "schema_version":   "1.0",
        "run_id":           run_id,
        "generated_at":     generated_at,
        "output_dir":       output_dir,
        "file_count":       len(file_artifacts),
        "files":            file_artifacts,
        "logical_artifacts": logical_artifacts,
    }
