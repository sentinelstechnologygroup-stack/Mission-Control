# Mission Control Startup Recovery Plan

## Purpose
Restore Mission Control automatically after Hermes terminal loss, PM2 daemon loss, mini-stack update, WSL/Ubuntu restart, Windows restart, internet outage, or power outage.

## Current Runtime Facts
- Runtime host: AICenter / WSL-style Ubuntu environment.
- Mission Control backend path: `/home/patrick/mission-control`.
- Local backend URL: `http://127.0.0.1:4174`.
- Active runtime manager: PM2.
- `systemd` is not available because PID 1 is not `systemd` in this environment.
- Cloudflare Tunnel must be managed under PM2, not `systemctl`.
- The prior `cert.pem` / `cloudflared tunnel login` path was abandoned for this environment.
- The canonical tunnel method is now a dashboard-created Cloudflare tunnel token stored outside the repo.

## Recovery Objectives
1. Restore the Mission Control backend automatically.
2. Restore the Cloudflare API tunnel automatically when the tunnel token exists.
3. Validate local backend health after startup.
4. Validate the protected executor endpoint without printing secrets.
5. Record recovery output to a persistent startup log.

## Automatic Recovery Flow
```text
power returns
→ PC powers on
→ Windows boots
→ Task Scheduler launches WSL
→ WSL runs /home/patrick/start-mission-control.sh
→ script runs pm2 resurrect
→ mission-control backend is restored or restarted
→ mc-api-tunnel is restored or restarted when /home/patrick/.cloudflared/mission-control-api.token exists
→ local health check passes
→ protected executor check passes
→ Cloudflare reconnects when internet is available
→ remote API becomes reachable again
```

## Startup Recovery Script
Path:
- `/home/patrick/start-mission-control.sh`

Responsibilities:
- confirm `pm2` is available
- run `pm2 resurrect`
- ensure `mission-control` is online under PM2
- ensure `mc-api-tunnel` is online under PM2 when `/home/patrick/.cloudflared/mission-control-api.token` exists
- run local `GET /api/health`
- run protected local `GET /api/executor/status` without printing `MC_BRIDGE_TOKEN`
- append output to `/home/patrick/mission-control/logs/startup-recovery.log`

Manual recovery command:
```bash
/home/patrick/start-mission-control.sh
```

## PM2 Recovery Commands
```bash
pm2 resurrect
pm2 status
pm2 restart mission-control
pm2 start server.js --name mission-control --cwd /home/patrick/mission-control
pm2 restart mc-api-tunnel
pm2 start /bin/bash --name mc-api-tunnel -- -lc 'exec "$(command -v cloudflared)" tunnel run --token "$(cat /home/patrick/.cloudflared/mission-control-api.token)"'
pm2 save
```

## Cloudflare Tunnel Recovery Behavior
The tunnel process is conditional:
- if `/home/patrick/.cloudflared/mission-control-api.token` does not exist, startup recovery must skip the tunnel cleanly
- if the token exists and `cloudflared` is installed, PM2 must restore or restart `mc-api-tunnel`
- the tunnel token must stay outside the repository at `/home/patrick/.cloudflared/mission-control-api.token`
- `chmod 600 /home/patrick/.cloudflared/mission-control-api.token`
- never print or commit the tunnel token or bridge token
- do not keep using the abandoned `cert.pem` path in this environment

## Cloudflare Dashboard Tunnel Method
Canonical setup flow:
```text
Cloudflare Dashboard
→ Zero Trust
→ Networks
→ Tunnels
→ Create tunnel
→ Cloudflared
→ Name: mission-control-api
→ Public hostname: mc-api.sentinelstechnologygroup.com
→ Service: http://127.0.0.1:4174
→ copy generated tunnel token or install command
```

Local handling rules:
- store the token only at `/home/patrick/.cloudflared/mission-control-api.token`
- never store the token in the Mission Control repo
- never print the token in reports
- never `cat` the token file to visible output
- do not use `systemctl`
- do not open router or firewall ports

## Cloudflare Tunnel Completion Gate
Do not claim the remote API tunnel is ready until all of the following are true:
- `/home/patrick/.cloudflared/mission-control-api.token` exists with restricted permissions
- PM2 shows `mc-api-tunnel` online
- public `/api/health` is reachable
- public `/api/executor/status` rejects no token
- public `/api/executor/status` rejects invalid token
- public `/api/executor/status` accepts a valid bridge token with HTTP 200

## Windows Task Scheduler Setup
Program:
```text
wsl.exe
```

Arguments:
```text
-d Ubuntu -- bash -lc "/home/patrick/start-mission-control.sh"
```

Required triggers:
- At startup
- At log on for Patrick

Recommended options:
- Run with highest privileges
- If task fails, restart every 5 minutes
- Attempt restart at least 12 times
- Stop task if it runs longer than 30 minutes
- Allow task to be run on demand

Optional trigger:
- On workstation unlock

## Power Outage / UPS / BIOS Guidance
Recommended hardware and firmware posture:
- add UPS battery backup
- set BIOS/UEFI `Restore on AC Power Loss` to `Power On` if available

Why it matters:
- without restore-on-power-loss, a long outage can still require physically pressing the power button
- with BIOS auto-power-on plus Task Scheduler, Mission Control can recover without manually opening terminals once power and internet return

## Validation Checklist
### Local startup recovery ready
- `/home/patrick/start-mission-control.sh` exists
- script is executable
- `pm2 save` has been run
- script starts or restores `mission-control`
- script starts or restores `mc-api-tunnel` when the token file exists
- script writes to `logs/startup-recovery.log`
- local `/api/health` check passes
- protected local `/api/executor/status` check passes without printing token

### Windows recovery ready
- Task Scheduler entry exists
- startup trigger exists
- logon trigger exists
- task uses `wsl.exe -d Ubuntu -- bash -lc "/home/patrick/start-mission-control.sh"`
- manual task run succeeds

### Power recovery ready
- UPS installed
- BIOS restore-on-AC-power-loss set to `Power On` if supported
- Windows boots after power return
- Task Scheduler launches WSL recovery
- PM2 restores Mission Control and tunnel

## Failure States
- `pm2` missing from PATH
- `.env` missing
- `MC_BRIDGE_TOKEN` missing
- local health endpoint fails
- local protected executor endpoint fails
- tunnel token exists but `cloudflared` binary is missing
- tunnel token is absent because dashboard token setup is incomplete
- Windows scheduled task is absent or misconfigured
- BIOS does not restore power automatically after outage

## Manual Recovery Sequence
```bash
cd /home/patrick/mission-control
pm2 resurrect || true
pm2 restart mission-control || pm2 start server.js --name mission-control --cwd /home/patrick/mission-control
if [ -f /home/patrick/.cloudflared/mission-control-api.token ]; then
  chmod 600 /home/patrick/.cloudflared/mission-control-api.token
  pm2 restart mc-api-tunnel || pm2 start /bin/bash --name mc-api-tunnel -- -lc 'exec "$(command -v cloudflared)" tunnel run --token "$(cat /home/patrick/.cloudflared/mission-control-api.token)"'
fi
pm2 save
/home/patrick/start-mission-control.sh
```

## Truthful Reporting Rules
- Do not use `systemctl` in this environment.
- Do not print `MC_BRIDGE_TOKEN`.
- Do not print the tunnel token.
- Do not `cat .env`.
- Do not declare Mission Control operational until phone-to-AICenter validation passes.
- Do not declare full power-outage resilience until a restart simulation passes.
