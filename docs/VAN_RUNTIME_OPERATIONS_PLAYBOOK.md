# Van Runtime Operations Playbook

## Mission Control Operating Doctrine
- Mission Control is STG’s private operations control system.
- Mission Control should feel like one app to Patrick, even when frontend, tunnel, and runtime are separated internally.
- Patrick should operate through Nettie and the executive layer.
- Hermes should serve as backend execution machinery, not the daily manual user interface.
- The trusted runtime is AICenter. Hosted frontend providers are interchangeable.
- Favor truthful operation over cosmetic status.

## Runtime Manager Decision Tree
1. Check if systemd is usable:
   - If systemd is PID 1, systemd may be used.
   - If systemd is not PID 1, do not use `systemctl`.
   - Use PM2 as the active Node runtime manager in this AICenter environment.

2. Check PM2:
   - `pm2 status mission-control`
   - If online, validate the backend endpoint.
   - If missing, start with PM2.

3. Validate protected backend:
   - Validate local `/api/executor/status` with token.
   - Do not print token.

4. Only after local backend is valid:
   - prepare Cloudflare Tunnel
   - configure DNS
   - configure hosted frontend envs if needed
   - run phone validation

## Mission Control Runtime Commands
```bash
pm2 status mission-control
pm2 logs mission-control --lines 80
pm2 restart mission-control
cd /home/patrick/mission-control
pm2 start server.js --name mission-control --cwd /home/patrick/mission-control
pm2 save
```

## Bridge Validation Checklist
- Confirm `.env` is gitignored.
- Confirm bridge token is present locally without printing it.
- Validate protected local `GET /api/executor/status` and expect HTTP 200.
- Validate protected local `POST /api/nettie/messages` and confirm a real queued job is created.
- Confirm executor state is truthful.
- If cooldown exists, surface cooldown truthfully.
- Never report delivery if backend job creation did not succeed.

## Remote Activation Checklist
- Confirm PM2 `mission-control` is online.
- Confirm backend is listening on `http://127.0.0.1:4174`.
- Install `cloudflared` if missing.
- Run `cloudflared tunnel login`.
- Create named tunnel `mission-control-api`.
- Route `mc-api.sentinelstechnologygroup.com` to `http://127.0.0.1:4174`.
- Validate public `GET /api/health`.
- Validate public protected status behavior:
  - no token rejects
  - invalid token rejects
  - valid token returns HTTP 200
- Configure hosted frontend envs if temporary split is still in use.
- Validate `/nettie` from desktop.
- Validate `/nettie` from phone.
- Run harmless queue-only bridge validation.
- Stop before production claims until Perry review is complete.

## Security Rules
- Never print the bridge token.
- Never `cat .env` into visible output.
- Never commit `.env`.
- Never include token values in reports.
- Report token state only as present, missing, validated, or rejected.
- Any token exposure requires immediate rotation.
- Do not open router or firewall ports.
- Use a tunnel, not direct exposure.
- Treat `VITE_MC_BRIDGE_TOKEN` as temporary only because it is browser-visible.
- Long-term auth must move behind a server-side proxy or secure session layer.
- Do not declare production-ready until Perry completes a security review.

## Escalation Rules
- Escalate before any production-ready declaration.
- Escalate if Cloudflare account access, DNS control, or external auth cannot be completed from the current environment.
- Escalate if token exposure is suspected or confirmed.
- Escalate if public validation reveals that the backend accepts unauthenticated or invalid-token requests.
- Escalate if hosted frontend behavior diverges from truthful backend acceptance state.

## Definitions of Done
### Local Runtime Ready
- PM2 `mission-control` process online.
- Local protected status endpoint returns HTTP 200.
- Backend reports truthful executor state.
- No secrets exposed.

### Remote Bridge Ready
- Cloudflare Tunnel active.
- Public hostname routes to local backend.
- No-token and invalid-token requests rejected.
- Valid-token request returns status.
- Hosted frontend uses correct API base.
- `/nettie` shows truthful executor state remotely.

### Phone-to-AICenter Ready
- Patrick opens `/nettie` from phone.
- Executor state is shown truthfully.
- Harmless command queues a real backend job.
- UI shows delivered only on backend acceptance.
- Logs and job records show traceability.

### Production Ready
- Perry security review complete.
- Token is not browser-exposed, or temporary exposure is knowingly accepted.
- Cloudflare Access or a server-side proxy plan is documented.
- No router port forwarding.
- No fake executor state.
- No secrets committed.
