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
npm run build
npm run preview
