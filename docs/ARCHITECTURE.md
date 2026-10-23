# Architecture

Prescripto is a modular TypeScript application deployed as a same-origin Cloudflare Worker. React, React Router, Tailwind CSS 4 and TanStack Query deliver the client. The API uses Web-standard Request/Response, Zod and parameterized D1 SQL. An Express compatibility layer would add no value on this runtime.

## Boundaries

- `src/pages`: route-level lazy-loaded presentation and feature interactions.
- `src/components`: navigation, reusable doctor cards and feedback.
- `src/api.ts`, `src/types.ts`: shared client transport, server-state hooks and domain DTOs.
- `worker/domain.ts`: input schemas and deterministic UTC scheduling policy.
- `worker/auth.ts`: scrypt hashing, cryptographic session hashing and secure cookies.
- `worker/api.ts`: authorization, application operations and database access.
- `worker/index.ts`: request routing and response security policy.
- `db/migrations`: ordered relational schema migrations, foreign keys and indexes.

## Data and concurrency

Patient and staff accounts share a users table with explicit server-controlled roles. Public registration always creates a patient. Staff are provisioned through an operator-only CLI. Session tokens are random, stored only as SHA-256 hashes and expire after seven days. Passwords use salted scrypt (N=16384, r=8, p=1, 64-byte output).

D1 (SQLite) provides durable SQL storage without a separate database server. The booking INSERT reads the current consultation fee and availability atomically from the doctor record. Partial unique indexes prevent two active bookings for the same doctor/time and prevent a patient booking two doctors at one time. Cancelled records remain available for history, while their slots can be booked again. Fee snapshots preserve the booked price when a doctor later changes pricing.

Availability uses seven future UTC dates, 09:00–17:00, in 30-minute increments. It refreshes every 30 seconds in the UI. Mutation responses remain authoritative when availability changes between selection and confirmation. A real clinic can extend this policy with weekly schedules, leave, and local time-zone/DST rules.

## Deployment

Normal `wrangler deploy` uses Workers Static Assets with API-first routing. `scripts/build-worker.mjs` also packages the frontend as a compressed asset map in a self-contained Worker for authenticated API deployment. Both use the same API and D1 binding. Assets stream through decompression; edge HTTP compression remains managed by Cloudflare. Fingerprinted JS/CSS get immutable caching; named imagery gets one-hour caching; HTML revalidates.

## Payments

Pay at clinic works without external services. Optional Stripe Checkout uses server-calculated amounts and signed webhooks. The return URL never marks a booking paid. Online payments are hidden when secrets are absent. Pending/paid bookings cannot be self-cancelled, avoiding unpaid refund obligations. Refunds and clinic-assisted cancellation after payment require operator handling; this is documented rather than simulated.

## Security and operations

Server-enforced patient ownership and doctor/admin roles; same-origin mutation checks; Zod constraints; parameterized queries; HttpOnly/SameSite cookies; HTTPS Secure cookies; CSP, HSTS and anti-framing headers; database-backed authentication and booking rate limits; audit records for staff/booking changes. No secrets in source control. Logs contain error metadata rather than submitted credentials.

This is a public portfolio demo with fictional providers, not a clinically validated healthcare product. Real operation requires verified providers, patient consent and retention policies, appropriate legal/security assessment, monitoring, backups/restore exercises, and a payment/refund and notification operating process. Automated account recovery, email/SMS notifications, clinical records and insurance billing are outside this release.
