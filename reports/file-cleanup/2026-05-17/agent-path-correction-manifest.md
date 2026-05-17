# Agent Path Correction Manifest

Date: 2026-05-17
Reason: prior migration targeted `/home/patrick/agents/Mission-Control`, but Patrick clarified the canonical Mission Control agent path must be `/home/patrick/mission-control/.agents`.

Correction rules:
- preserve rollback
- do not break Mission Control
- do not delete `/home/patrick/agents/Mission-Control` contents until the new path is populated and validated
- final canonical real data location must be `/home/patrick/mission-control/.agents`
- after validation, old parent path may remain only as compatibility symlink structure or empty parent

Rollback path:
- restore `server.js` agentsRoot to previous known-good value
- point `/home/patrick/agents/Mission-Control` back to the last real data location if needed
- restart PM2 mission-control
- validate `/api/agents`, `/api/runtime/checkpoint`, `/api/context/compact/nettie`
