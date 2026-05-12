# Mission Control Runtime Runbook

## Mission Control Identity
- Mission Control is STG’s private operations control system.
- Mission Control is not inherently a Vercel app.
- Hosting provider is interchangeable.
- Patrick should interact through Mission Control, Nettie, and the executive agents.
- Hermes should become backend execution machinery, not the normal user interface.

## Current Deployment Model
- The current hosted frontend exists and can route work when connected to the backend bridge.
- AICenter is the trusted runtime.
- The local backend runs on `http://127.0.0.1:4174`.
- PM2 is the current process manager.
- systemd is unavailable in this AICenter environment because PID 1 is not systemd.
- Do not keep attempting `systemctl` commands in this environment.

## Current Bridge State
- Protected `GET /api/executor/status` works locally with the bridge token.
- Protected `POST /api/nettie/messages` works locally with the bridge token.
- The backend reports truthful executor state.
- Do not mark commands delivered unless backend job creation succeeds.
- Do not fake executor availability.

## Runtime Manager
- PM2 process name: `mission-control`
- Start command:
  ```bash
  pm2 start server.js --name mission-control --cwd /home/patrick/mission-control
  ```
- Save command:
  ```bash
  pm2 save
  ```
- Status command:
  ```bash
  pm2 status mission-control
  ```
- Logs command:
  ```bash
  pm2 logs mission-control --lines 80
  ```

## Current Blockers
- Cloudflare Tunnel is not active.
- DNS/public route is not configured.
- Hosted frontend environment bridge configuration is not set.
- Phone validation is not complete.
- Perry security review is required before any production-ready declaration.

## Preferred Next Path
### Temporary split first
```text
current hosted frontend
→ mc-api.sentinelstechnologygroup.com
→ Cloudflare Tunnel
→ AICenter PM2 backend at http://127.0.0.1:4174
```

### Future consolidated path
```text
missioncontrol.sentinelstechnologygroup.com
→ Cloudflare Access / secure login
→ Cloudflare Tunnel
→ AICenter-hosted full Mission Control app/runtime
```

## Security Rules
- Do not print the bridge token.
- Do not `cat .env`.
- Do not commit secrets.
- Do not open router or firewall ports.
- Use a tunnel, not direct exposure.
- Treat `VITE_MC_BRIDGE_TOKEN` as temporary only because it is browser-visible.
- Long-term token handling should move behind a server-side proxy or auth layer.

## Validation Checklist
- PM2 online.
- Local protected status endpoint returns HTTP 200.
- Public endpoint rejects no-token and invalid-token requests.
- Public endpoint accepts a valid token.
- Hosted frontend uses the correct API base.
- Phone `/nettie` loads.
- A harmless command queues a real job.
- UI shows delivered only on backend acceptance.

## Notes
- Current local runtime manager is PM2, not systemd.
- The remote-access goal is secure phone/home/away access into the AICenter runtime without exposing backend ports directly.
- Do not declare Mission Control operational from phone until the public tunnel path and phone validation both pass.
