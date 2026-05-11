#!/usr/bin/env python3

import json
import sys
from pathlib import Path

EXIT_VALID = 0
EXIT_FILE_MISSING = 1
EXIT_INVALID_JSON = 2
EXIT_MISSING_REQUIRED_FIELD = 3
EXIT_INVALID_STATUS = 4
EXIT_EMPTY_RESULT = 5
EXIT_UNEXPECTED_ERROR = 9

REQUIRED_FIELDS = ("id", "status", "result")
VALID_STATUSES = {"completed", "blocked", "failed"}


def fail(code: int, message: str) -> int:
    print(message)
    return code


def result_is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict, tuple, set)):
        return len(value) == 0
    return False


def main(argv: list[str]) -> int:
    try:
        if len(argv) != 2:
            return fail(
                EXIT_UNEXPECTED_ERROR,
                "VALIDATION ERROR: expected exactly one argument: path to task result JSON file.",
            )

        path = Path(argv[1])
        if not path.is_file():
            return fail(
                EXIT_FILE_MISSING,
                f"VALIDATION FAILED: file not found: {path}",
            )

        try:
            raw = path.read_text(encoding="utf-8")
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            return fail(
                EXIT_INVALID_JSON,
                f"VALIDATION FAILED: invalid JSON in {path}: {exc.msg} at line {exc.lineno} column {exc.colno}",
            )

        if not isinstance(data, dict):
            return fail(
                EXIT_MISSING_REQUIRED_FIELD,
                "VALIDATION FAILED: top-level JSON value must be an object with fields: id, status, result",
            )

        for field in REQUIRED_FIELDS:
            if field not in data:
                return fail(
                    EXIT_MISSING_REQUIRED_FIELD,
                    f"VALIDATION FAILED: missing required field: {field}",
                )

        status = data["status"]
        if status not in VALID_STATUSES:
            allowed = ", ".join(sorted(VALID_STATUSES))
            return fail(
                EXIT_INVALID_STATUS,
                f"VALIDATION FAILED: invalid status '{status}'. Allowed values: {allowed}",
            )

        if result_is_empty(data["result"]):
            return fail(
                EXIT_EMPTY_RESULT,
                "VALIDATION FAILED: result must not be empty",
            )

        print(f"VALIDATION PASSED: {path}")
        return EXIT_VALID
    except Exception as exc:
        return fail(
            EXIT_UNEXPECTED_ERROR,
            f"VALIDATION ERROR: unexpected validator error: {exc}",
        )


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
