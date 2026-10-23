# Quality assurance report

Release date: 23 October 2026. This report distinguishes checks that ran from checks that remain unavailable.

## Pass 1 — Architecture and code quality

Reviewed routing, client/server boundaries, schema relationships, role provisioning, API input schemas, password/session handling and source configuration. Implemented separate route modules, shared UI, domain validation and authorization utilities. Formatting is enforced with Prettier. Public registration ignores a client-supplied privileged role.

## Pass 2 — Functionality and integration

Executed Vitest against actual workerd and disposable D1 storage, with migration and seed setup. Coverage includes registration/login/logout, profile persistence, doctor listing and availability, off-grid bookings, concurrent booking conflicts, patient collision prevention, unauthorized reads/mutations, staff roles, doctor availability/profile updates, administrative create/edit, appointment completion and cancellation/slot release. React Testing Library checks doctor card details, availability text, filtering and actionable empty states. The final suite has **24 tests** across **3 test files**.

Manual Chrome checks: home render, all-doctors navigation, Dermatologist filter (15 results to 3), provider detail, date/time controls, selected-slot behavior and sign-in redirect. Responsive component harness renders the same application components at **390px** and **768px**; home layouts and mobile menu/directory navigation were visually inspected. Desktop was inspected at approximately **1363px** viewport width. Responsive harness files are temporary QA artifacts and are excluded from deployment/source delivery.

Authenticated workflows were executed in runtime API integration tests. Authenticated browser journeys were not exercised end-to-end in this environment. Firefox, Safari, screen readers and physical mobile devices were not tested.

## Pass 3 — Performance, security and deployment

Executed TypeScript checks, ESLint, production Vite build, runtime integration tests and npm dependency audit. Initial checks found and fixed a frontend JSON type error, test-runtime API/version mismatches, compressed asset response handling, a missing font artifact and development dependency advisories. The final dependency audit reported **0 known vulnerabilities** at the time checked.

Security review also added bounded streaming request reads, atomic payment/cancellation guards, future-only completion rules, server-side fee snapshots, strict image paths, HTTPS security headers, same-origin mutation checks and database-level appointment constraints.

The home page’s entry JavaScript is approximately **71 kB gzip**, with separately cached vendor/query chunks of approximately **18/11 kB gzip**, and CSS approximately **9 kB gzip**. Other routes load on demand. Source PNG images are converted to WebP; the supplied image/icon collection is approximately 0.5 MB total. Images declare dimensions, the hero image has high fetch priority, and lower-page portraits are lazy-loaded. One self-hosted Latin variable font is used.

No Lighthouse/Core Web Vitals score was measured. No load/stress test, penetration test or formal accessibility audit was performed. These must not be inferred from successful builds or unit tests.

## Release limitations

Pay-at-clinic scheduling works without external services. Optional Stripe code has no live/test provider keys configured and was not tested against Stripe. Its disabled configuration response is tested. No real payments, refunds or notifications were sent. Emails/SMS, password recovery and verification, medical records and insurance workflows are not implemented. Staff accounts require operator provisioning. Fixed UTC scheduling is intentional.

This release is a deployable portfolio application; it is not represented as a clinically or legally approved production healthcare system.
