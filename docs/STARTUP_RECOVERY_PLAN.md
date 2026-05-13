# Mission Control Startup Recovery Plan

## Purpose
Restore Mission Control automatically after Hermes terminal loss, PM2 daemon loss, mini-stack update, WSL/Ubuntu restart, Windows restart, internet outage, or power outage.

## Current Runtime Facts
- Runtime host: AICenter / WSL-style Ubuntu environment.
- Mission Control backend path: `/home/patrick/mission-control`.
- Local backend URL: `http://127.0.0.1:4174`.
- Active runtime manager: PM2.
- `systemd` is not available because PID 1 is not `systemd` in this environment.
- Cloudflare Tunnel should be managed under PM2, not `systemctl`.

## Recovery Objectives
1. Restore the Mission Control backend automatically.
2. Restore the Cloudflare API tunnel automatically when tunnel config exists.
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
→ mc-api-tunnel is restored or restarted when ~/.cloudflared/config.yml exists
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
- ensure `mc-api-tunnel` is online under PM2 when `/home/patrick/.cloudflared/config.yml` exists
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
pm2 start "$(command -v cloudflared)" --name mc-api-tunnel -- tunnel --config /home/patrick/.cloudflared/config.yml run mission-control-api
pm2 save
```

## Cloudflare Tunnel Recovery Behavior
The tunnel process is conditional:
- if `/home/patrick/.cloudflared/config.yml` does not exist, startup recovery must skip the tunnel cleanly
- if config exists and `cloudflared` is installed, PM2 must restore or restart `mc-api-tunnel`
- tunnel config must stay outside the repository
- never print or commit `cert.pem`, tunnel credential JSON, or token values

## Cloudflare Tunnel Completion Gate
Do not claim the remote API tunnel is ready until all of the following are true:
- `/home/patrick/.cloudflared/cert.pem` exists
- named tunnel `mission-control-api` exists
- `/home/patrick/.cloudflared/config.yml` exists and validates
- DNS routes `mc-api.sentinelstechnologygroup.com` through the tunnel
- PM2 shows `mc-api-tunnel` online
- public `/api/health` is reachable
- public `/api/executor/status` rejects no token
- public `/api/executor/status` rejects invalid token
- public `/api/executor/status` accepts a valid token with HTTP 200

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
- script starts or restores `mc-api-tunnel` when config exists
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
- Cloudflare config exists but `cloudflared` binary is missing
- tunnel config is absent because cert/tunnel setup is incomplete
- Windows scheduled task is absent or misconfigured
- BIOS does not restore power automatically after outage

## Manual Recovery Sequence
```bash
cd /home/patrick/mission-control
pm2 resurrect || true
pm2 restart mission-control || pm2 start server.js --name mission-control --cwd /home/patrick/mission-control
if [ -f /home/patrick/.cloudflared/config.yml ]; then
  pm2 restart mc-api-tunnel || pm2 start "$(command -v cloudflared)" --name mc-api-tunnel -- tunnel --config /home/patrick/.cloudflared/config.yml run mission-control-api
fi
pm2 save
/home/patrick/start-mission-control.sh
```

## Truthful Reporting Rules
- Do not use `systemctl` in this environment.
- Do not print `MC_BRIDGE_TOKEN`.
- Do not `cat .env`.
- Do not print `cert.pem` or tunnel credential JSON.
- Do not declare Mission Control operational until phone-to-AICenter validation passes.
- Do not declare full power-outage resilience until a restart simulation passes.
