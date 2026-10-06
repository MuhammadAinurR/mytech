@AGENTS.md

# Workbench: working agreement

A multi-user Next.js platform for personal and business operations: transactions,
recurring rules, credentials, companies and invoices, projects.

Before writing UI, read `DESIGN.md`. Before making a structural decision, check
`docs/adr/`. Next.js here is v16+; read `node_modules/next/dist/docs/` before
using an API you are not sure about.

## Git workflow (non-negotiable)

- `main` is always green and deployable. Never commit directly to `main`.
- Every small, logical change gets its own branch, merged into `main`, then pushed.
  One concern per branch.
- Branch names: `<type>/<scope>-<short-description>`, for example
  `db/revenue-migration`, `feat/revenue-actions`, `ui/revenue-page`,
  `chore/docker-compose`, `fix/invoice-rounding`.
- Split features by layer, each merged before the next starts:
  1. `db/...` schema and migration
  2. `feat/...` server logic (queries, actions, route handlers) and tests
  3. `ui/...` pages and components
- Commits follow Conventional Commits (`feat(revenue): add recurring rule table`)
  with a short body explaining why. `ui/*` commits include a self-critique:
  what was checked in screenshots and what was adjusted.
- Per-change loop:

  ```sh
  git switch main && git pull
  git switch -c <branch>
  # implement
  npm run verify   # typecheck + lint + test + build; must exit 0
  git commit
  git switch main && git merge --no-ff <branch> && git push origin main
  git branch -d <branch>
  ```

- Merge only when typecheck, lint, tests, and build all pass. Fix failures on the
  same branch. Gate on the exit code of `npm run verify`; never pipe it through a
  filter that hides a failing status.
- Never force-push, never rewrite history on `main`, never use `--no-verify`.
- After each merge, print one line: branch, what changed, test status.

## Local environment

- Postgres `postgres/postgres@localhost:5432`. Only ever create, drop, or reset
  databases named `workbench_*` (`workbench_dev`, `workbench_test`). Other
  databases on this server belong to other projects.
- Redis `localhost:6379`. Dev uses DB 1, tests use DB 2, all keys are prefixed
  `wb:`. Never `FLUSHALL`/`FLUSHDB` DB 0.
- Config lives in `.env.local` (gitignored). `.env.example` documents every
  variable. `.env.test` holds non-secret test values and is committed.
- `npm run worker` runs the BullMQ worker as its own process.

## Engineering practices

- **Layout.** `src/app` holds routes only. Feature code lives in
  `src/features/<feature>/` (`schema.ts` zod, `actions.ts`, `components/`,
  `lib/` pure logic, `*.test.ts`). Data access lives in
  `src/server/queries/<feature>.ts`. Infrastructure lives in `src/server/`
  (`db`, `redis`, `auth`, `crypto`, `queue`, `logger`). Shared UI lives in
  `src/components/ui`, shared helpers in `src/lib`.
- **Boundaries.** Every module touching the DB, Redis, crypto, or env starts with
  `import 'server-only'`. Default to Server Components; add `"use client"` only
  for interactivity. Only `src/server/**` may import the DB client (ESLint
  enforces this).
- **Authorization.** Every query takes `userId` and scopes by it. Every server
  action and route handler calls `requireUser()` first and validates input with
  zod, including params and search params. Middleware (`proxy.ts`) is only an
  optimistic redirect, never the authority.
- **Types.** Strict TypeScript, no `any`. Derive types from Drizzle schemas and
  zod; do not hand-write duplicates.
- **Money.** Integer minor units (`bigint`) plus an ISO currency code. Never
  floats. Format with `Intl.NumberFormat` and tabular numerals.
- **Dates.** Timestamps are `timestamptz` in UTC. Pure dates (due date, start,
  end, occurrence) are `date` and handled as `YYYY-MM-DD` strings. Render in the
  user's timezone.
- **Database.** FKs, NOT NULL, CHECK and unique constraints, indexes on
  `user_id` and every filter/sort column, `created_at`/`updated_at` everywhere,
  UUID ids. Use transactions where invariants matter. Every schema change ships
  as a generated, reviewed SQL migration.
- **NULL-safe CHECKs.** A CHECK that evaluates to NULL passes. When a branch of
  a CHECK compares a nullable column (`BETWEEN`, `IN`, `=`), guard it with an
  explicit `col IS NOT NULL AND …`, and add a schema test that inserts the
  NULL case.
- **Errors.** Expected failures return `{ ok: false, error }` (see
  `src/lib/result.ts`). Unexpected ones throw to error boundaries. User-facing
  messages are generic and never leak internals.
- **Secrets.** Never log secrets, passwords, tokens, or cookies (the logger
  redacts them). Credential secrets are AES-256-GCM encrypted with a versioned
  key and are never returned by list queries.
- **Tests.** Unit tests for pure logic, integration tests for queries and actions
  against `workbench_test`, Playwright for critical flows. New behavior ships
  with tests.
- **UI.** Follow `DESIGN.md`. Use tokens only: no hard-coded colors, spacing,
  radii, or shadows. Tailwind's default palette is removed on purpose. Before
  merging a `ui/*` branch, take screenshots at 390, 768, and 1440px in both
  themes, review them against `DESIGN.md`, fix what you find, and run the axe
  check.

## Commands

| Command                               | Purpose                                      |
| ------------------------------------- | -------------------------------------------- |
| `npm run dev`                         | Next.js dev server                           |
| `npm run worker`                      | BullMQ worker (recurring entries, reminders) |
| `npm run typecheck` / `lint` / `test` | Quality gates                                |
| `npm run build`                       | Production build                             |
| `npm run test:e2e`                    | Playwright flows (builds and starts the app) |
| `npm run db:generate` / `db:migrate`  | Create and apply SQL migrations              |
| `npm run db:seed`                     | Seed a demo account in `workbench_dev`       |
