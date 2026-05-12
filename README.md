# Mission Control UI

Mission Control UI is the operator surface for the Mission Control system. It is a React + Vite application designed to provide a high-trust, command-oriented interface for supervising agents, workloads, artifacts, approvals, and system health.

## Purpose

This application serves as the front-end control surface for Mission Control. It is intended to support:

- command center visibility
- department and agent oversight
- run and job monitoring
- artifact and report access
- system state and provider visibility
- future live operational wiring to backend services

## Current Status

The UI is currently in an early operator-shell phase.

Current focus includes:

- stabilizing the shared application shell
- preserving existing high-value UI surfaces
- removing legacy runtime lock-in
- standardizing routing and layout ownership
- preparing for live data integration

## Tech Stack

- React
- Vite
- Tailwind CSS
- React Router
- Radix UI
- Lucide React

## Development Principles

This project follows these working rules:

- preserve working UX wherever possible
- replace runtime/data plumbing without destroying useful interface surfaces
- avoid unnecessary rewrites of forms, drawers, modals, cards, and workflow panels
- keep one shared shell and one central route contract
- prioritize operator workflow over decorative dashboard patterns

## Local Development

### Prerequisites

- Node.js 18+ recommended
- npm 9+ recommended

### Install dependencies

```bash
npm install
npm run dev
npm run backend
npm run dev:all
npm run build
npm run preview
```

### Runtime commands

- `npm run dev` — starts the Vite frontend on port `5173`
- `npm run backend` — starts the Mission Control API/runtime on port `4174`
- `npm run dev:all` — starts frontend + backend together

### Executor bridge requirements

`/nettie` is operational only when the frontend can reach the Mission Control backend runtime.

Required local endpoints:

- `GET /api/health`
- `POST /api/chat`
- `GET /api/chat/history`
- `GET /api/jobs/ledger`
- `GET /api/workers`

Local development contract:

- frontend origin: `http://127.0.0.1:5173`
- backend origin: `http://127.0.0.1:4174`
- Vite proxies `/api/*` to the backend runtime
- executor availability is determined by the live backend, not by static UI state

### Remote frontend / Vercel limitation

Vercel can host the React frontend, but it does not host the persistent Mission Control executor runtime by itself.

For a truthful remote `/nettie` deployment, use this architecture:

- Vercel frontend
- persistent Mission Control backend/runtime on a sandbox or server
- executor process available on that backend host
- `VITE_API_BASE_URL` pointed at the backend origin
- secure command bridge between frontend and runtime

If `VITE_API_BASE_URL` is not set for a remote deployment, frontend requests to `/api/*` will hit the Vercel origin and can fall back to static HTML or fail to reach the real executor. That can make `/nettie` look loaded while command delivery is not actually connected.

Example remote env:

```bash
VITE_API_BASE_URL=https://your-runtime-host.example.com
```

### Deployment note

Do not represent remote executor availability unless the backend runtime is live and responding. `/nettie` must show real backend state, create real jobs, and preserve truthful unavailable states when the executor bridge is offline.