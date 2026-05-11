# SYS-004 Build Plan

1. Create `scripts/validate_task_result.py` as a standalone CLI validator.
2. Accept a single JSON file path argument.
3. Validate file existence.
4. Validate JSON parsing succeeds.
5. Validate required top-level fields: `id`, `status`, `result`.
6. Validate `status` is one of `completed`, `blocked`, or `failed`.
7. Validate `result` is not empty.
8. Return deterministic exit codes for each failure mode.
9. Create fixture files under `tests/fixtures/` for valid and invalid cases.
10. Run manual validator commands against each fixture.
11. Confirm observed exit codes match expected behavior.
