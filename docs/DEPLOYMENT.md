# Deployment and operations

## Existing live application

- Application: https://prescripto.ramtinbabaei-portfolio.workers.dev
- Source: https://github.com/RamtinBabaei/prescripto-platform
- Runtime: Cloudflare Worker `prescripto`
- Database: D1 `prescripto-db`

The application is hosted directly on Cloudflare. GitHub Pages alone cannot run its authenticated API or database.

## Deploy from your computer

```bash
npm ci
npx wrangler login
npx wrangler whoami
npm run typecheck
npm run lint
npm run build
npm test
npx wrangler d1 migrations apply prescripto-db --remote
npx wrangler d1 execute prescripto-db --remote --file db/seed.sql
npx wrangler deploy
```

The checked-in configuration identifies the existing database; do not replace its ID when deploying to the same account. For a different account, create a new D1 database with `npx wrangler d1 create prescripto-db`, replace its ID in `wrangler.jsonc`, apply migrations and seed. Doctor seeds use `INSERT OR IGNORE` and do not overwrite existing profiles.

A self-contained Worker artifact is also produced at `.deploy/worker.mjs` for API-based publishing. Normal CLI deployment uses Static Assets and `worker/index.ts`. Both execute the same application logic. Do not deploy `.deploy/worker.mjs` through the normal configuration without accounting for its embedded assets.

## GitHub Actions

`ci.yml` runs type checks, lint, build, tests, formatting and dependency audit. `deploy.yml` is a manual workflow. Add these repository secrets before using it:

- `CLOUDFLARE_API_TOKEN`: narrowly scoped to edit this account’s Workers and D1.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID.

Then open Actions → Deploy → Run workflow. The workflow applies tracked migrations and deploys; sample data is seeded only during initial setup. The current live deployment was published directly through the connected Cloudflare account; workflow secrets are not automatically created or copied from the connection.

## Staff access

Run `npm run staff:create` from an operator machine. Select the live database only when provisioning a live account. Public registration cannot grant staff roles. Do not share administrator credentials in the README or a public demo account. Use a separate local database for unrestricted test data.

## Optional Stripe configuration

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

Use Stripe test mode first. Configure a webhook endpoint at `/api/payments/webhook` for `checkout.session.completed` and `checkout.session.expired`. The signing secret belongs to this endpoint. Checkout amounts are derived from stored appointment fees; never trust a return URL as proof of payment. Test successful payment, decline, timeout, abandoned checkout, webhook retries and cancellation races before enabling real payments. No Stripe account was available during this delivery, so actual provider interaction is unverified.

Pending/paid appointments require clinic-assisted cancellation and refund handling. Refund automation is outside this release. An expired signed checkout event releases an unpaid payment lock; a network-interrupted checkout without a session may require operator investigation. Keep online payments disabled until the full operating process has been validated.

## Custom domain

In Cloudflare, open Workers & Pages → prescripto → Settings → Domains & Routes → add a custom domain you control. The supplied workers.dev address is already usable without buying a domain. Session cookies automatically gain the Secure flag on HTTPS. Keep frontend and API on the same origin.

## Backups and monitoring

Before schema changes, export D1 with `npx wrangler d1 export prescripto-db --remote --output backup.sql` and store the export securely outside the repository. Exercise restoration in a separate database. Use Workers logs and `/api/health` for health investigation; avoid logging request bodies, passwords or session tokens. Audit records describe booking/staff mutations. Establish a data retention and account-deletion operating policy before collecting real information.
