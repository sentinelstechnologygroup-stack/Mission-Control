"""
run_report — Mission Control Run Artifact + Execution Report Layer.

Generates a complete run bundle from a finished MissionControl execution:
  run_summary.md          — human-readable markdown summary
  run_trace.json          — machine-readable execution trace
  artifacts_manifest.json — inventory of all produced artifacts
  final_delivery/         — packaged deliverables ready for handoff

Quick start:
    from run_report import run_reporter
    paths = run_reporter.generate(mc, run_id="run_001", output_dir="./reports/run_001")
"""
from .run_reporter import generate

__all__ = ["generate"]
