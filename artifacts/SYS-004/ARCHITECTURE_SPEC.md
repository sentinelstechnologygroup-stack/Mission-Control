# SYS-004 Architecture Spec

Validator flow
- input -> validation -> exit code

Flow detail
1. Receive file path from CLI input.
2. Confirm the target file exists.
3. Parse JSON content.
4. Validate required top-level fields.
5. Validate status value.
6. Validate result payload is non-empty.
7. Print deterministic validation outcome.
8. Exit with the appropriate code.

Exit codes
- 0: valid
- 1: file missing
- 2: invalid json
- 3: missing field
- 4: invalid status
- 5: empty result
- 9: unexpected error
