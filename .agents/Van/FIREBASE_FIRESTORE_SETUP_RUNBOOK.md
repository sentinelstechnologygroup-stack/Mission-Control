# Van — Firebase / Firestore Setup Runbook

## Purpose
Give Van a repeatable setup path for Firebase projects, Firestore, auth, local environment wiring, and deployment readiness.

## Use when
- a website or app needs Firebase auth
- a project needs Firestore as primary persistence
- a Base44/local prototype is being migrated to Firebase
- a new product needs a fast managed backend

## Prerequisites
Before setup, Van must know:
- project name
- environments needed: local / staging / production
- auth providers required
- data entities and expected relationships
- whether file storage, functions, hosting, or messaging are needed
- who needs access

If this is not defined, Van records assumptions in `ENVIRONMENT_MATRIX.md` and routes open questions to Nettie.

## Standard setup sequence

### 1. Create the Firebase project structure
Van creates separate environments when the product matters operationally:
- dev
- staging
- prod

Naming pattern example:
- `product-dev`
- `product-staging`
- `product-prod`

Record in:
- `FIREBASE_PROJECT_MAP.md`

### 2. Enable required Firebase products
At minimum, decide explicitly whether the project needs:
- Authentication
- Firestore Database
- Storage
- Hosting
- Functions
- Analytics
- Crash reporting

Do not enable services casually. Record what is on and why.

### 3. Define the Firestore model before coding
Van defines collections, core fields, indexes, and access rules before implementation.

Output artifact:
- `FIRESTORE_SCHEMA.md`

For each collection, document:
- collection name
- document id strategy
- required fields
- optional fields
- createdAt/updatedAt handling
- ownership fields
- query patterns
- needed composite indexes

### 4. Define auth and identity model
Van documents:
- auth providers enabled
- user profile document shape
- role model
- invitation flow if any
- session/redirect behavior

Output artifact:
- `AUTH_MODEL.md`

### 5. Configure local development
Van sets up:
- `.env.local`
- `.env.staging` if used
- `.env.production` or deployment secrets mapping
- client SDK config variables
- server/admin SDK credentials handling if server code exists

Minimum environment keys usually include:
- Firebase API key
- Auth domain
- Project ID
- Storage bucket
- Messaging sender ID
- App ID

If admin/server access exists, also document:
- service account source
- where secrets live
- which runtime consumes them

Output artifact:
- `ENV_SETUP.md`

### 6. Implement Firebase boundaries correctly
Van does not scatter Firebase calls across random UI files.
Use layers:
- adapters/firebase
- services/domain
- pages/components consume services

This keeps migrations and QA cleaner.

### 7. Write Firestore security rules early
Van must define rules before calling the setup complete.
Rules should answer:
- who can read each collection?
- who can write?
- what ownership/org checks apply?
- what fields must not be client-controlled?

Output artifacts:
- `firestore.rules`
- `FIRESTORE_RULES_NOTES.md`

### 8. Define indexes and emulator/local test path
Van documents:
- required composite indexes
- emulator usage if project benefits from it
- local test flow for auth + Firestore operations

Output artifacts:
- `firestore.indexes.json`
- `LOCAL_TEST_FLOW.md`

### 9. Deployment readiness
Before launch or review, Van verifies:
- env vars are correctly mapped per environment
- security rules are deployed from tracked files
- production project id is correct
- no dev keys are wired into production
- admin credentials are not client-exposed
- error logging exists for important flows

Output artifact:
- `FIREBASE_RELEASE_CHECKLIST.md`

## QA / Perry handoff for Firebase projects
When QA or Perry needs to review, Van sends:
- Firebase products enabled list
- Firestore schema doc
- rules file and summary
- env matrix without exposing secrets inappropriately
- risky flows to attack/test
- seed accounts or test credentials path
- deployment target

## Scrub checklist specific to Firebase / Firestore
Before QA, Van must verify:
- no placeholder config remains
- no duplicated Firebase initialization
- no secret values committed to repo
- rules are not left wide open
- collection names match code references
- indexes for key queries are defined
- timestamp fields are consistent
- auth-required routes fail safely
- deleted users/org members lose access as expected

## Minimum definition of done
A Firebase/Firestore setup is not done until these exist:
- `FIREBASE_PROJECT_MAP.md`
- `FIRESTORE_SCHEMA.md`
- `AUTH_MODEL.md`
- `ENV_SETUP.md`
- `firestore.rules`
- `firestore.indexes.json`
- `FIREBASE_RELEASE_CHECKLIST.md`

## Escalation triggers
Route to Nettie when:
- environment split has cost/ops implications
- data model affects finance/reporting across departments
- Perry blocks release on rule design or exposure risk
- migration from legacy system changes roadmap or scope
