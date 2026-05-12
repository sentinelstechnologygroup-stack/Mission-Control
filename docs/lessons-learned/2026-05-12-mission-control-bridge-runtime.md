# Mission Control Lessons Learned — 2026-05-12

## Executive Summary
Mission Control backend bridging now works locally on the AICenter runtime under PM2. The key learning is that Mission Control should be treated as STG’s private operations control system with a hosted frontend and a persistent backend/runtime, not as a frontend-only Vercel app. Local protected bridge endpoints are working truthfully. Remote activation is still blocked on Cloudflare Tunnel, DNS routing, hosted frontend environment wiring, phone validation, and Perry review.

## What We Were Trying To Accomplish
- Make Mission Control accessible remotely from phone/home/away from the mini-stack.
- Keep Patrick interacting through Nettie and the executive agent layer, not through raw backend tools.
- Wire the hosted frontend to the trusted AICenter runtime.
- Ensure status, delivery, queueing, and executor state are truthful.

## What Worked
- AICenter backend on `http://127.0.0.1:4174` responded locally.
- PM2 became the correct runtime manager for this environment.
- PM2 process `mission-control` came online.
- `pm2 save` completed.
- PM2 logs confirmed:
  - `Mission Control listening on http://127.0.0.1:4174`
  - `Codex available: yes`
  - `Hermes available: yes`
- `.env` remained gitignored.
- Protected `GET /api/executor/status` with bridge token returned HTTP 200.
- Protected `POST /api/nettie/messages` with bridge token worked locally.
- Nettie bridge created real queued jobs locally.
- Backend reported truthful executor state, including active cooldown conditions.

## What Failed
- The systemd activation path failed in this environment.
- Repeated `systemctl` attempts could not work because PID 1 is not systemd.
- Remote/public activation is still incomplete.
- Cloudflare Tunnel is not yet active.
- DNS/public route is not yet configured.
- Hosted frontend env bridge configuration is not yet set.
- Phone validation is not yet complete.

## Root Causes
- The environment is AICenter/WSL-like and does not boot with systemd as PID 1.
- Early hosting assumptions blurred the difference between a hosted frontend and the trusted backend runtime.
- Secure remote access requires a tunnel-backed backend route, not just a frontend deployment.
- Temporary browser-visible token usage is acceptable only for validation, not long-term security.

## Key Technical Facts Learned
- Mission Control is STG’s private operations control system.
- Mission Control is not “a Vercel app.”
- Hosting provider is interchangeable.
- Patrick should communicate with Nettie and executive agents through Mission Control.
- Hermes should become backend execution machinery, not the daily manual user interface.
- Correct architecture is:

```text
Mission Control App
├── Frontend UI
│   ├── Nettie
│   ├── System
│   ├── Operations
│   ├── Costs
│   ├── Jobs
│   ├── Agents
│   └── Logs
│
├── Command API
│   ├── submit command
│   ├── check executor state
│   ├── read queue
│   ├── read job status
│   └── return clean Nettie response
│
├── Runtime Bridge
│   ├── secure tunnel
│   ├── token/session validation
│   ├── command routing
│   └── executor availability checks
│
└── AICenter Runtime
    ├── Hermes
    ├── Claude CLI
    ├── local agents
    ├── project folders
    ├── GitHub
    └── deployments
```

## Security Lessons
- The bridge token was rotated after diagnostic exposure risk.
- Never print the bridge token.
- Never `cat .env` into visible logs.
- Never include the token in reports.
- Never commit `.env`.
- Reports should say only `token present`, `token missing`, `token validated`, or `token rejected`.
- Any accidental token exposure requires immediate rotation.

## Runtime / Process Manager Lessons
- PM2 is the active runtime manager in this environment.
- systemd is not usable here because PID 1 is not systemd.
- Repeated `systemctl` attempts produced:
  - `System has not been booted with systemd as init system (PID 1). Can't operate.`
  - `Failed to connect to bus: Host is down.`
- Do not keep trying `systemctl` in this environment.
- Do not ask Patrick for a sudo password for a path already proven invalid.
- Core PM2 commands to remember:
  ```bash
  pm2 status mission-control
  pm2 logs mission-control --lines 80
  pm2 restart mission-control
  cd /home/patrick/mission-control
  pm2 start server.js --name mission-control --cwd /home/patrick/mission-control
  pm2 save
  ```

## Bridge / API Lessons
- Protected `GET /api/executor/status` with token returns HTTP 200 locally.
- Protected `POST /api/nettie/messages` with token works locally.
- Do not mark a command delivered unless backend job creation succeeded.
- If backend is unreachable, UI must show failure or unavailable.
- If executor is in cooldown, UI must show cooldown.
- If executor is unavailable, the command must not be marked delivered.
- If a job is queued, it must correspond to a real backend job.
- Current executor reports as `codex`.
- Hermes is also detected as available.
- Cooldown state is real and must be shown truthfully.

## Frontend / Hosting Lessons
- Hosted frontend is only one layer of the system.
- The secure backend runtime on AICenter is the trusted execution layer.
- Preferred immediate temporary split:
  ```text
  current hosted Mission Control frontend
  → mc-api.sentinelstechnologygroup.com
  → Cloudflare Tunnel
  → AICenter PM2 backend at http://127.0.0.1:4174
  ```
- Future consolidated path:
  ```text
  missioncontrol.sentinelstechnologygroup.com
  → Cloudflare Access / secure login
  → Cloudflare Tunnel
  → AICenter-hosted full Mission Control app/runtime
  ```
- If the hosted frontend remains temporary, it needs:
  - `VITE_MC_API_BASE_URL=https://mc-api.sentinelstechnologygroup.com`
  - `VITE_MC_BRIDGE_TOKEN=<current bridge token>`
- `VITE_` variables are browser-visible.
- This token exposure pattern is temporary validation only.
- Long-term production should move the bridge token behind a server-side proxy or auth layer.

## What Van Must Remember Next Time
- First identify the actual runtime manager before attempting service activation.
- If systemd is not PID 1, stop using `systemctl`.
- When PM2 and local protected endpoints are already working, move to the next phase instead of continuing to code.
- The next phase is: tunnel, DNS, hosted frontend envs if needed, phone validation, and Perry review.
- Do not overbuild.
- Do not redesign.
- Do not reintroduce Base44.
- Do not change architecture unless required for truthful operation.

## Current Final State
- Mission Control local backend runs on `http://127.0.0.1:4174`.
- PM2 is active and `mission-control` is online.
- `.env` is gitignored.
- Bridge token is configured locally and was rotated after exposure risk.
- Local protected bridge endpoints work.
- Backend reports truthful executor state.
- Remote activation is not complete.

## Next Required Actions
- Install and authenticate `cloudflared`.
- Create the named tunnel for `mc-api.sentinelstechnologygroup.com`.
- Route the tunnel to `http://127.0.0.1:4174`.
- Validate public API behavior with no token, invalid token, and valid token.
- Configure hosted frontend env vars only after the public API route is confirmed.
- Run phone validation only after the public route exists.
- Complete Perry security review before any production-ready declaration.

## Do Not Repeat
- Do not keep attempting `systemctl` when systemd is not PID 1.
- Do not ask Patrick for sudo password for a path already proven invalid.
- Do not expose bridge token in tool output.
- Do not treat Vercel as the requirement.
- Do not mark Mission Control operational until phone validation passes.
- Do not call the backend remote ready until Cloudflare, DNS, and the public endpoint work.
- Do not fake executor availability.
- Do not fake delivery.
