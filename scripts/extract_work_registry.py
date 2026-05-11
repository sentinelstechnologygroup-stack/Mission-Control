#!/usr/bin/env python3

import json
import sys
from pathlib import Path

EXIT_FILE_MISSING = 1
EXIT_INVALID_JSON = 2
EXIT_UNEXPECTED_STRUCTURE = 3

JOB_KEYS = (
    "id",
    "jobId",
    "task",
    "runner",
    "status",
    "routeStatus",
    "source",
    "createdAt",
    "updatedAt",
)
SECTION_KEYS = (
    "active",
    "queued",
    "running",
    "blocked",
    "paused",
    "completedRecent",
)


def error_exit(code: int) -> None:
    raise SystemExit(code)


def load_registry(path_str: str) -> dict:
    path = Path(path_str)
    if not path.is_file():
        error_exit(EXIT_FILE_MISSING)

    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
    except json.JSONDecodeError:
        error_exit(EXIT_INVALID_JSON)

    if not isinstance(data, dict):
        error_exit(EXIT_UNEXPECTED_STRUCTURE)

    return data


def normalize_job(job: dict) -> dict:
    if not isinstance(job, dict):
        error_exit(EXIT_UNEXPECTED_STRUCTURE)

    status = job.get("status")
    if status == "completed":
        return None

    runner = job.get("runner")
    if runner is None:
        runner = job.get("agent")
    if runner is None:
        runner = job.get("owner")

    normalized = {
        "id": job.get("id"),
        "jobId": job.get("jobId"),
        "task": job.get("task"),
        "runner": runner,
        "status": status,
        "routeStatus": job.get("routeStatus"),
        "source": job.get("source"),
        "createdAt": job.get("createdAt"),
        "updatedAt": job.get("updatedAt"),
    }

    return normalized


def extract_jobs(registry: dict) -> list:
    jobs = []

    for section_name in SECTION_KEYS:
        if section_name not in registry:
            continue

        section = registry[section_name]
        if not isinstance(section, list):
            error_exit(EXIT_UNEXPECTED_STRUCTURE)

        for job in section:
            normalized = normalize_job(job)
            if normalized is not None:
                jobs.append(normalized)

    return jobs


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        error_exit(EXIT_UNEXPECTED_STRUCTURE)

    registry = load_registry(argv[1])
    jobs = extract_jobs(registry)
    json.dump(jobs, sys.stdout, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
