# Mission Control Department Office Audit

## Department overview board

- `/api/departments/workflows` reports 9 departments total: 8 real, 1 demo.
- The demo department is Novella.
- The overview board is live and useful, but it still carries one demo surface.

## Live office surfaces

### `/departments/command`
- Resolves to Nettie.
- Shows live workload: 19 queued jobs, 0 blocked, 0 approvals.
- Shows archived / historical job rows as the active table content.
- Still missing workflow templates.
- This is a live office, but not yet a full command-center experience.

### `/departments/technology`
- Resolves to Van.
- Shows live workload: 214 current workload, 20 blocked/rejected, 12 completed, 20 failed.
- Shows a live jobs table and live execution health.
- Still missing workflow templates.
- This is the strongest office surface and should be the model for the others.

## Live office surfaces with honest empty states

These routes now load truth-labeled department offices. Some are still sparse, but they no longer rely on generic slug-only scaffolding:
- `/departments/media`
- `/departments/security`
- `/departments/finance`
- `/departments/opportunity`
- `/departments/research`
- `/departments/admin`

Common state on those pages:
- department header
- department head / manager
- employee desks
- workflow canvas
- queue/status board
- evidence panel
- internal messages / handoffs
- blocked work
- completed work
- honest empty states such as "No active work packets" and "No live workflow records yet."

## Missing or static employee / agent desks

### Static or seeded desks
- `/agents` is now source-labeled and registry-backed.
- Several desks still resolve as seeded/unavailable rather than fully live.
- Some desk evidence remains registry-backed rather than executor-backed.

### Missing desks
- Novella remains a demo/reference surface in the department overview.
- Some non-primary desks still resolve as seeded labels when no live registry record is present.

## What should be replaced first

1. Add real workflow templates and evidence-bearing lanes to the empty department offices.
2. Add live desk panels from the agent registry to the Agents page.
3. Replace the hardcoded executive/org-chart cards with live agent status views.
4. Normalize the slug aliasing so office headings render human department names everywhere.
5. Surface Novella as a real desk or explicitly mark it as demo/reference-only.

## Office-by-office status

| Route | Status | Notes |
| --- | --- | --- |
| `/departments/command` | Live and truthful | Nettie office is populated and now uses honest empty states where needed |
| `/departments/technology` | Live and truthful | Van office is the most complete and now uses the office workflow model |
| `/departments/media` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/security` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/finance` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/opportunity` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/research` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |
| `/departments/admin` | Live but sparse | Truth-labeled office shell with employee desks and honest empty states |

## Recommendation order for office recovery

1. Continue replacing seeded/unavailable desks with executor-backed live truth where a real registry record exists.
2. Tighten evidence parity for office pages that still only have sparse activity.
3. Keep non-office legacy pages clearly labeled until they are rebuilt.
