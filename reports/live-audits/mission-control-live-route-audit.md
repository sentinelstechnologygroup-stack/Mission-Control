# Mission Control Live Route Audit

## Audit date
2026-05-21

## Summary
The live domain resolves to a Cloudflare Access login gate from this browser session, so authenticated live-page verification is currently blocked. Local Mission Control routes and backend endpoints are working, including the Aurora persistence path and department office routes.

## Live route status observed
| Route | Status | Notes |
|---|---|---|
| `https://missioncontrol.sentinelstechnologygroup.com/` | Auth blocked | Cloudflare Access login page returned |
| `https://missioncontrol.sentinelstechnologygroup.com/aurora` | Auth blocked | Cloudflare Access login page returned |
| `https://missioncontrol.sentinelstechnologygroup.com/departments/technology` | Not live-verified | Could not reach app shell because of Access gate |
| `https://missioncontrol.sentinelstechnologygroup.com/departments/media` | Not live-verified | Could not reach app shell because of Access gate |
| `https://missioncontrol.sentinelstechnologygroup.com/departments/security` | Not live-verified | Could not reach app shell because of Access gate |
| `https://missioncontrol.sentinelstechnologygroup.com/departments/finance` | Not live-verified | Could not reach app shell because of Access gate |

## Local route status
| Route | Status | Notes |
|---|---|---|
| `/` | Loads | App shell loads locally |
| `/triage` | Loads | Routed page present |
| `/nettie` | Loads | Routed page present |
| `/aurora` | Loads | Aurora POC loads with backend persistence |
| `/operations` | Loads | Routed page present |
| `/departments` | Loads | Department overview renders |
| `/departments/technology` | Loads | Alias resolves to Van office |
| `/departments/security` | Loads | Alias resolves to Perry office |
| `/departments/command` | Loads | Alias resolves to Nettie office |
| `/agents` | Loads | Routed page present |
| `/missions` | Loads | Routed page present |
| `/approvals` | Loads | Routed page present |
| `/calendar` | Loads | Routed page present |
| `/intelligence` | Loads | Routed page present |
| `/knowledge` | Loads | Routed page present |
| `/system` | Loads | Routed page present |

## API status observed locally
- `GET /api/health` -> 200
- `GET /api/aurora/state` -> 200
- `GET /api/aurora/jobs` -> 200
- `GET /api/departments/technology` -> 200
- `GET /api/departments/security` -> 200
- `GET /api/departments/command` -> 200

## 404/root-cause assessment
- SPA rewrite exists in `vercel.json`.
- Department office pages exist in the React router.
- Backend department alias handling now resolves office slugs like `technology`, `security`, and `command` to canonical departments.
- The current blocker for live verification is Cloudflare Access, not a local route crash.

## Conclusion
The live site could not be fully verified from this session because the authenticated app shell is behind Cloudflare Access. Locally, the routes and backend aliases are functioning and the department office pages render correctly.
