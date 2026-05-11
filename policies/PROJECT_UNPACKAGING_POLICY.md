MISSION CONTROL — STANDARD PROJECT UNPACKAGING POLICY

Purpose:
Create one repeatable unpackaging workflow for all project types:
- websites
- apps
- dashboards
- portals
- client systems
- Base44 exports
- ZIP handoffs
- rebuilds
- internal tools

This policy applies to every new project unless Patrick explicitly overrides it.

==================================================
STANDARD PROJECT LOCATIONS
==================================================

All new website/app/project builds go under:

~/projects/websites/

Final project format:

~/projects/websites/<project-slug>/

ZIP source format:

~/projects/websites/<project-slug>.zip

Examples:
~/projects/websites/sentinels-design-lab/
~/projects/websites/sentinels-design-lab.zip

Do NOT build new projects in:
~/projects/

unless Patrick explicitly says so.

==================================================
STEP 1 — MOVE / COPY SOURCE PACKAGE
==================================================

Move or copy the approved ZIP/export into:

~/projects/websites/

Rename it to a clean standardized filename:

<project-slug>.zip

Rules:
- one ZIP only
- no "(1)" or "(2)" duplicate naming
- no spaces in final ZIP filename
- do not unpack from Downloads long-term
- do not use old project folders as source of truth

Verify:

ls -lh ~/projects/websites/

Expected:
<project-slug>.zip

==================================================
STEP 2 — UNPACKAGE / EXTRACT CLEANLY
==================================================

Extract into:

~/projects/websites/

Command:

unzip ~/projects/websites/<project-slug>.zip -d ~/projects/websites/

Expected final folder:

~/projects/websites/<project-slug>/

Check for nesting:

ls -la ~/projects/websites/<project-slug>

If nested folder exists, fix before proceeding.

Bad:
~/projects/websites/<project-slug>/<project-slug>/package.json

Good:
~/projects/websites/<project-slug>/package.json

==================================================
STEP 3 — CLEAN PREPACKAGED BUILD ARTIFACTS
==================================================

Never trust ZIP-contained runtime/build artifacts.

Always remove:

cd ~/projects/websites/<project-slug>

rm -rf node_modules
rm -rf .next
rm -rf dist
rm -rf build
rm -rf .vite
rm -rf .turbo
rm -rf node_modules/.cache

Do NOT remove source files.

==================================================
STEP 4 — INSTALL + BUILD BASELINE
==================================================

Run:

npm install
npm run build

Rules:
- build must pass before any design or code changes
- if build fails, fix baseline first
- do not start redesign work before baseline build is known

Report:
- package count / install result
- warnings
- build result
- framework detected

==================================================
STEP 5 — LAUNCH LOCAL BASELINE
==================================================

After build passes:

npm run dev

or if port conflict:

npm run dev -- -p 3001

Verify local site:
- page loads
- no blank screen
- no console runtime errors
- routes render
- baseline matches ZIP/export visually

Important:
From Step 5 forward, every meaningful change must follow:

npm run build
npm run dev / browser verify

==================================================
STEP 6 — BASE44 DETECTION
==================================================

Check whether the project came from Base44.

Search:

grep -R "base44" -n . --exclude-dir=node_modules --exclude-dir=.next
find . -iname "*base44*"

Also inspect:
- package.json
- src/
- app/
- components/
- lib/
- utils/
- api/
- integrations/

If NO Base44:
Proceed to Step 8.

If Base44 exists:
Proceed to Step 7.

==================================================
STEP 7 — REMOVE BASE44
==================================================

Policy:
Base44 is upstream generator only.
Base44 is never production runtime.

Remove:
- Base44 SDK/runtime dependencies
- Base44 auth stubs
- Base44 generated API wrappers
- placeholder entities not used by production
- fake/demo data paths
- unused generated screens
- external Base44 runtime assumptions

Replace with:
- Firebase
- Firestore
- local data adapters
- clean API routes
- production-safe services

After removal:

npm run build
npm run dev

Verify:
- no Base44 imports
- no Base44 runtime calls
- site/app still works

==================================================
STEP 8 — GITHUB BASELINE
==================================================

Check remote:

git remote -v

If no repo:
- create/connect GitHub repo
- initialize if needed

Baseline commit rule:
After clean install/build/local verification, commit the clean baseline before modifications.

Commands:

git status --short
git add relevant files only
git commit -m "Baseline unpackaged project from approved source"
git push origin main

Do NOT commit:
- node_modules
- .next
- dist/build artifacts unless required by project type
- .env files
- secrets
- temporary extraction folders
- duplicate ZIP files
- unrelated files

==================================================
STEP 9 — VERCEL SETUP / DEPLOYMENT
==================================================

After GitHub baseline is pushed:

- Connect repo to Vercel if not already connected
- Confirm framework settings
- Confirm build command
- Confirm output settings
- Add required environment variables
- Deploy preview
- Verify deployment routes

Do NOT point production domain until:
- build passes
- preview verified
- QA complete
- Patrick approves launch

==================================================
STEP 10 — POST-CHANGE LOOP
==================================================

After every project change:

1. npm run build
2. npm run dev
3. browser QA
4. git status --short
5. git add relevant files only
6. git commit -m "<clear change description>"
7. git push origin main

Policy:
Successful build + connected GitHub + relevant changes = commit and push.

If build fails:
- do not commit
- do not push
- fix first

==================================================
STANDARD REPORT FORMAT
==================================================

Every unpackaging report must include:

- Project name:
- Project slug:
- Source ZIP:
- Final project path:
- Extracted cleanly:
- Nested folder issue:
- Removed artifacts:
- npm install result:
- npm run build result:
- Local dev result:
- Base44 detected:
- Base44 removed:
- GitHub remote:
- Baseline commit:
- Push status:
- Vercel status:
- Remaining issues:

==================================================
SDL CURRENT NEXT STEP
==================================================

For the current SDL reset:

Project path:
~/projects/websites/sentinels-design-lab/

Current status:
- ZIP renamed correctly
- extracted cleanly
- node_modules removed
- .next removed
- npm install passed
- npm run build passed

Next required step:
Run local baseline verification.

Command:

cd ~/projects/websites/sentinels-design-lab
npm run dev

Then verify:
http://localhost:3000

If port conflict:
npm run dev -- -p 3001

Do NOT modify the design yet.
Do NOT remove Base44 yet.
Do NOT push redesign changes yet.

First confirm the clean ZIP baseline visually.
