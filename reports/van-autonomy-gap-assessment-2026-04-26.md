# Van Autonomy Gap Assessment — 2026-04-26

## Executive summary
Van has the correct executive charter and authority on paper, but his persistent operational memory is underdeveloped. He is not yet sufficiently documented to run end-to-end app/website delivery and Firebase/Firestore setup autonomously without Patrick repeatedly supplying process steps.

## Evidence observed
- `/home/patrick/agents/Van/IDENTITY.md` correctly defines Van as Chief Technology and Operations Officer and product realization authority.
- `/home/patrick/agents/Van/DOMAIN_OWNERSHIP.md` gives Van authority over architecture, implementation direction, sequencing, and sub-agent assignment.
- `/home/patrick/agents/Van/MEMORY.md` was effectively empty.
- `/home/patrick/agents/Van/TASKS.md` had no active tasks and only general completion criteria.
- `/home/patrick/agents/Van/rules.md` contains high-level doctrine and QA rejection conditions, but not execution runbooks.
- The shared groceries sandbox includes a future Firebase adapter seam, but there was no general Van-side Firebase/Firestore setup runbook.

## Current standing
Van understands his title, mandate, and guardrails.
Van does not yet have enough codified step-level operating memory to reliably:
- intake and scope a build with minimal supervision
- run a repeatable build/scrub/QA cycle
- set up Firebase/Firestore consistently from a reusable checklist
- package clean handoffs to QA/Perry and Nettie every time

## Primary gap categories
1. No persistent build playbook
2. No persistent scrub + QA packet standard
3. No persistent Firebase / Firestore setup runbook
4. No durable examples in Van memory showing what “autonomous completion” looks like

## Immediate correction applied
Created:
- `/home/patrick/agents/Van/APP_WEBSITE_DELIVERY_RUNBOOK.md`
- `/home/patrick/agents/Van/FIREBASE_FIRESTORE_SETUP_RUNBOOK.md`

## Next recommended tightening
- add templated artifact stubs for each required document
- wire these documents into Nettie routing expectations and Perry QA intake expectations
- populate Van memory with recurring technical doctrine and decisions from live jobs
- restore Mission Control backend on port 4174 so runtime job routing/ledger verification is live again

## Infrastructure note
Mission Control backend on `localhost:4174` was not reachable during this audit. Vite on 5173 was running, but the backend/ledger API was not available for live routing verification.
