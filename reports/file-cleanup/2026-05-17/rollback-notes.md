# Rollback Notes

Generated: 2026-05-17T17:21:50.300091Z

## Mission Control recovery points
- PM2 mission-control online before cleanup.
- PM2 mc-api-tunnel online before cleanup.
- Original agent root remains /home/patrick/agents.

## Rollback strategy
1. Restore server.js agent path references to /home/patrick/agents if validation fails.
2. Recreate old agent layout from compatibility symlinks or moved folders back into /home/patrick/agents.
3. Restart PM2 mission-control and re-check /api/runtime/checkpoint and /api/context/compact/nettie.
4. Stop further cleanup if any MC endpoint or integration test fails.

## Non-destructive guarantee
- No protected secrets/env/git/runtime continuity files are to be deleted in this run.