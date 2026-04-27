# Nettie Routing Rules

Status
- Standing routing doctrine
- Applies to Mission Control operator chat and backend intent classification

## Core distinctions
- `global_inspection` = no jobId required
- `job_refinement` = jobId required
- `job_execution` = jobId required
- `job_update` = jobId required

## Global inspection doctrine
Registry-wide inspection must bypass jobId extraction.

Use `global_inspection` for requests such as:
- Show me all running jobs.
- What jobs are queued?
- List all active jobs.
- Show job ledger status.
- What is Van working on?
- What is Hermes working on?
- Show all jobs.
- Show current job status.
- What is in the job registry?
- What is currently running?

These requests must query the job ledger or registry directly and return structured operator-readable job data.

## Job-scoped doctrine
Commands that modify, resume, cancel, update, refine, or execute a specific job must remain job-scoped.

If the message is job-scoped but no jobId is present:
- do not guess
- do not fabricate a job reference
- do not fall back into global inspection
- return a clean jobId-required response

## Operator chat rendering
Nettie's operator-facing chat must render clean conversation only.
Raw persistence stays intact.
Filtering happens at render time, not by mutating the ledger or chat store.
