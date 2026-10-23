# Prescripto

A full-stack appointment platform that connects patients with specialists and gives clinic staff a clear view of their practice.

**[Live demo](https://prescripto.ramtinbabaei-portfolio.workers.dev)** · [Architecture](docs/ARCHITECTURE.md) · [QA report](docs/QA-REPORT.md) · [Deployment](docs/DEPLOYMENT.md)

Built by **Ramtin Babaei** with React, TypeScript, Tailwind CSS, TanStack Query, Cloudflare Workers and D1.

## Features

- Search, speciality and availability filters, and fee/experience sorting.
- Doctor profiles, live slot availability, conflict-safe booking and cancellation.
- Patient registration, persistent sign-in, profile editing and appointment history.
- Calendar exports for upcoming consultations.
- Doctor portal for assigned appointments, practice details, fees and availability.
- Admin portal for clinic statistics, patients, doctor creation/editing and appointment management.
- Server-side role authorization, secure session cookies, salted scrypt passwords, validation, rate limits and audit records.
- Pay at clinic, plus optional Stripe-hosted checkout and signed webhook verification.
- Responsive layouts, reduced-motion support, keyboard focus states, lazy route loading, optimized WebP imagery and a self-hosted font.

This is a **portfolio demo with fictional providers**, not a real medical service. Use sample information. Online payments are disabled in the public demo; optional Stripe integration requires operator credentials and live-provider testing.

## Run locally in VS Code

Install **Node.js 22.13 or newer** and VS Code. No MongoDB, PostgreSQL server or Docker is required.

1. Download and extract the project ZIP, or clone this repository.
2. In VS Code, choose **File → Open Folder** and select the folder containing `package.json`.
3. Open **Terminal → New Terminal** and run:

```bash
npm ci
npm run setup
npm run dev
```

Open **http://localhost:4173**. The same local Worker serves the frontend and API. Local data persists under `.wrangler/state`; it is separate from the live database. Cloudflare login is not needed for local development.

`npm run setup` applies local migrations, adds 15 fictional doctors and builds the frontend. It is safe to repeat. After frontend edits, run `npm run build` to refresh the compiled UI. For faster UI editing, leave the Worker running, open a second terminal, run `npm run dev:ui`, and use the Vite URL printed in the terminal (usually http://localhost:5173). Vite proxies `/api` to port 4173.

### Verify the local application

- Open `http://localhost:4173/api/health`; expect `status: "ok"` and `database: "connected"`.
- Browse All doctors and select a speciality.
- Create a sample patient account with a password of at least 10 characters.
- Open a doctor profile, choose a day and time, and confirm an appointment.
- Open My appointments, download its calendar entry, then cancel it.
- Refresh the doctor’s profile and confirm the cancelled slot is available again.
- Edit My profile and reload to confirm persistence.

### Staff accounts

Public registration always creates a patient. Provision staff from an authenticated operator terminal:

```bash
npm run staff:create
```

The interactive command asks for role, name and email, and masks the password. A doctor account also needs an existing doctor profile ID, such as `doc1`. Select the local database for local testing. Sign in at `/login`, then open `/staff`. No privileged account credentials are committed to this repository.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
npm test
npm audit
```

Tests include React component checks and API integration tests against the actual Workers runtime and a disposable D1 database. The API suite covers ownership checks, role restrictions, booking concurrency, validation, cancellation, persistence and staff operations. See the [QA report](docs/QA-REPORT.md) for executed checks and verification limits.

## Project structure

```text
src/
  components/       Shared UI and navigation
  pages/            Patient and staff routes
  api.ts            Typed fetch transport and query hooks
  types.ts          Domain response types
worker/
  index.ts          Worker entry and security headers
  api.ts            Authorized API operations
  auth.ts           Password and session utilities
  domain.ts         Zod schemas and scheduling rules
db/
  migrations/       Versioned SQL schema
  seed.sql          Fictional doctor data
scripts/            Build, development and operator tools
tests/              Component, domain and runtime integration tests
docs/               Architecture, deployment and QA notes
```

## Deployment

The live deployment uses your Cloudflare account and durable D1 storage. Source code is published on GitHub. CI runs on pushes and pull requests. The deployment workflow is manual and uses repository secrets, so a routine source push cannot accidentally overwrite the live database. Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to enable future automated deployments, configure a custom domain or activate Stripe.

## Scope and operating limits

Appointment windows are 09:00–17:00 UTC, in 30-minute intervals, across the next seven dates. Accounts expire their sessions after seven days. Staff accounts are operator-provisioned. Email verification, password recovery, automated reminders, online refunds, medical records and insurance billing are outside this release. Real clinical operation needs a separate compliance, security and operating review. No Lighthouse score or multi-browser compatibility result is claimed without measurement.

The supplied visual assets retain their original rights; consult [the reference review](docs/REFERENCE-REVIEW.md) before commercial reuse. Outfit is included under its OFL license.
