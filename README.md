# Workbench

A private, multi-user platform for running personal and business operations:
income and expenses with recurring entries and renewal reminders, an encrypted
credential store, companies and invoices (print and PDF), and project planning
on a board and a calendar.

## Features

- **Transactions.** Income and expenses in several currencies, stored as integer
  minor units, with monthly totals per currency. Recurring rules run monthly (a
  day of month) or yearly (a month and day); the 31st and Feb 29 clamp to the
  last day of shorter months. A background worker generates the entries
  idempotently. Renewals show the next 90 days and remind you ahead of time.
- **Credentials.** Secrets are sealed with AES-256-GCM: a unique IV per write,
  AAD bound to the owner and record, and versioned keys you can rotate.
  Reveal and copy go through one rate-limited path, and every use is
  audit-logged.
- **Companies and invoices.** Per-company numbering that stays correct under
  concurrent creates. Line items, tax, and discount are computed on the server
  with integer math. Invoices move from draft to sent to paid. Each one has a
  print-optimized page and a server-rendered PDF.
- **Projects.** A drag-and-drop board (keyboard accessible, with a "Move to"
  fallback) and a month calendar of ongoing work. Ongoing projects need a
  start and end date.
- **Dashboard.** The month's net, net by month, what's due soon, unpaid
  invoices, and ongoing projects.
- **Everywhere.** Light and dark themes, a ⌘K command palette, responsive
  layouts, keyboard navigation, and a design system documented in
  [`DESIGN.md`](DESIGN.md).

## Stack

Next.js 16 (App Router, server actions) · TypeScript (strict) · PostgreSQL with
Drizzle ORM and SQL migrations · Redis (sessions, rate limits) · BullMQ worker ·
zod · Tailwind CSS 4 with Radix primitives · dnd-kit · @react-pdf/renderer ·
pino · Vitest and Playwright (with axe).

## Getting started

Prerequisites: Node 24+, PostgreSQL 15+, and Redis 7+ running locally.

```sh
npm install
cp .env.example .env.local
# Generate an encryption key and paste it into ENCRYPTION_KEYS (as 1:<key>):
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npm run db:migrate   # creates workbench_dev if needed and applies migrations
npm run db:seed      # optional: demo account with realistic data
npm run dev          # http://localhost:3000
npm run worker       # in a second terminal: recurring entries and reminders
```

The seed prints the demo login (`demo@workbench.local` /
`workbench-demo-2026`). Running it again recreates that account only.

Scripts only ever create, migrate, or reset databases named `workbench_*`.
Development uses Redis DB 1 and tests use DB 2, all under the `wb:` key prefix.

## Scripts

| Script                                | What it does                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`     | Next.js dev server, production build, production server                                |
| `npm run worker`                      | BullMQ worker: recurring generation (every 15 min) and reminders (hourly)              |
| `npm run verify`                      | Typecheck, lint, unit and integration tests, and build: the merge gate                 |
| `npm run typecheck` / `lint` / `test` | Individual gates (`test` rebuilds `workbench_test` from migrations)                    |
| `npm run test:e2e`                    | Playwright flows against a production build on port 3100                               |
| `npm run test:visual`                 | Design review: screenshots at 390/768/1440 in both themes, plus axe and console checks |
| `npm run db:generate` / `db:migrate`  | Generate a SQL migration from the schema, apply migrations                             |
| `npm run db:seed`                     | Recreate the demo account                                                              |
| `npm run keys:rotate`                 | Re-seal credential secrets with the current encryption key                             |
| `npm run format` / `format:check`     | Prettier                                                                               |

## Architecture

```
src/
  app/                 routes only: (auth) sign-in/up, (app) shell + pages,
                       (print) invoice print page, api/ (health, logo, PDF)
  features/<name>/     schema.ts (zod, shared by forms and actions), actions.ts,
                       components/, lib/ (pure logic), *.test.ts
  server/              server-only: db/ (Drizzle client, schema), queries/ (the
                       data-access layer), auth/, crypto/, jobs/, queue/, redis,
                       logger, images
  worker/              BullMQ worker process
  components/          app shell and shared UI (components/ui = design system)
  lib/                 shared pure helpers: money, dates, months, validation
drizzle/               versioned SQL migrations
e2e/                   Playwright flows and the visual review harness
docs/adr/              architecture decision records
```

- **Requests.** `proxy.ts` sets a per-request CSP nonce and redirects
  signed-out visitors (as a UX shortcut only). Every page, action, and route
  handler calls `requireUser()`, then the data-access layer, which scopes every
  query by the owner's id.
- **Mutations** are server actions that take `unknown` input, parse it with the
  feature's zod schema, and return a typed `Result`. Next.js checks the Origin
  header and cookies are `SameSite=Lax`, which together cover CSRF.
- **Sessions** are random tokens in an httpOnly cookie. Redis is keyed by the
  token's hash, with a sliding 30-day TTL. Changing your password revokes every
  session.
- **Navigation is stale-while-revalidate.** A revisited page appears
  instantly from the client cache, then refreshes in the background and
  updates in place. It also refreshes when you return to the browser tab
  (ADR 0008).
- **Background work** runs in `npm run worker`, never in request handlers.
  Correctness comes from the database (unique occurrence keys and row locks),
  so jobs are safe to retry.
- **Health.** `GET /api/health` checks Postgres and Redis.

## Testing

- **Unit:** recurrence dates, invoice math, money parsing, encryption, design
  token contrast.
- **Integration (Vitest, real Postgres/Redis):** every DAL and action,
  including cross-user isolation tests, concurrency (invoice numbering, board
  moves, recurring generation), and a real BullMQ worker.
- **End to end (Playwright):** sign up, add a transaction, create and print an
  invoice (and download its PDF), and move a project card by menu and by
  keyboard.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests, and
build, then the Playwright suite, against Postgres and Redis service
containers.

## Decisions

| ADR                                                          | Decision                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| [0001](docs/adr/0001-dynamic-rendering-and-strict-csp.md)    | Dynamic rendering with a nonce-based CSP (Cache Components off) |
| [0002](docs/adr/0002-money-as-integer-minor-units.md)        | Money as integer minor units with pinned currency exponents     |
| [0003](docs/adr/0003-custom-redis-sessions.md)               | A small custom session layer on Redis instead of Auth.js        |
| [0004](docs/adr/0004-recurring-generation-worker.md)         | Idempotent recurring generation on a BullMQ worker              |
| [0005](docs/adr/0005-credential-encryption.md)               | AES-256-GCM with versioned keys and audited reveals             |
| [0006](docs/adr/0006-invoice-pdf-rendering.md)               | Invoice PDFs with react-pdf on node_modules React               |
| [0007](docs/adr/0007-data-access-layer-and-authorization.md) | One owner-scoped data-access layer behind an auth gate          |
| [0008](docs/adr/0008-stale-while-revalidate-navigation.md)   | Stale-while-revalidate between pages                            |

## Troubleshooting

- **The dev server serves stale CSS or modules after `npm run build` or
  `npm run verify`.** The build rewrites `.next`. Restart `npm run dev`.
- **Signing in says "Too many attempts."** Login is limited per email and IP.
  Wait 15 minutes, or in development delete the `wb:rl:*` keys from Redis DB 1.
- **Rotating the encryption key.** Add `2:<new key>` to `ENCRYPTION_KEYS`, set
  `ENCRYPTION_KEY_VERSION=2`, and run `npm run keys:rotate`. Once it reports 0
  re-sealed, remove the old key.
