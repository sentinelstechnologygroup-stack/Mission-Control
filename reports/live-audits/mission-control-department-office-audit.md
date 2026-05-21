# Mission Control Department Office Audit

## Deployment architecture

- Frontend UI host: `https://mission-control-livid-zeta.vercel.app`
- Backend/API truth host: `https://mc-api.sentinelstechnologygroup.com`
- Vercel serves the frontend SPA shell; backend API truth is a separate host.

## Department overview board

- `/api/departments/workflows` reports 9 departments total: 8 real, 1 demo.
- The demo department remains Novella.
- The overview board is live and useful, with one explicit demo surface still visible in the registry.

## Live office surfaces

### `/departments/command`
- Resolves to Nettie.
- Shows live workload and honest empty states where no packet history is present.
- Has employee desks, workflow canvas, queue/status board, evidence drawer, internal messages, blocked work, and completed work sections.
- Still sparse on actual workflow template depth.

### `/departments/technology`
- Resolves to Van.
- Shows the strongest office surface with live workload, live jobs, and truthful empty states.
- Acts as the model office for the rest of the department floors.

### `/departments/media`
### `/departments/security`
### `/departments/finance`
### `/departments/opportunity`
### `/departments/research`
### `/departments/admin`
- These routes load truth-labeled office shells rather than generic static pages.
- They include department head office, agent desks, current work packets, workflow canvas, handoff lines, blocked work, completed work, evidence drawer, and meeting/conference concept sections.
- When there is no live packet, they show honest empty states such as:
  - `No active work packets`
  - `No live workflow records yet.`

## Missing or static employee / agent desks

### Static or seeded desks
- `/agents` is source-labeled and registry-backed.
- Several desks still resolve as seeded/unavailable rather than fully live.
- Some desk evidence remains registry-backed rather than executor-backed.

### Missing desks
- Novella remains a demo/reference surface in the department overview.
- Some non-primary desks still resolve as seeded labels when no live registry record is present.

## What should be replaced first

1. Add more real workflow templates and evidence-bearing lanes where live history exists.
2. Continue replacing seeded/unavailable desks with executor-backed live truth where a real registry record exists.
3. Surface Novella as a real desk or explicitly mark it as demo/reference-only everywhere it appears.
4. Keep the department office model consistent across all floors.

## Office-by-office status

| Route | Status | Notes |
| --- | --- | --- |
| `/departments/command` | Live and truthful | Nettie office is populated and uses honest empty states where needed |
| `/departments/technology` | Live and truthful | Van office is the most complete and uses the office workflow model |
| `/departments/media` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/security` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/finance` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/opportunity` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/research` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/admin` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |

## Recommendation order for office recovery

1. Keep the office pages aligned with live registry data and honest empty states.
2. Add more true workflow templates where the registry already has them.
3. Continue tightening evidence parity for office pages that are still sparse.
4. Keep non-office legacy pages clearly labeled or converted as operational surfaces.
