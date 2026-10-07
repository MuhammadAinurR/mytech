# 0007. One data-access layer, scoped by owner, behind an authorization gate

- Status: accepted
- Date: 2026-10-07

## Context

Workbench is multi-user, and every table holds one person's private data. A
single missing `WHERE user_id = …` would leak or corrupt another user's
records. Pages, server actions, and route handlers are many and grow with
every feature, so isolation can't depend on each of them getting it right.

## Decision

- **One way into the database.** Only `src/server/**` (and the worker) may
  import the Drizzle client. ESLint enforces this with `no-restricted-imports`.
  Pages, actions, and components call `src/server/queries/<feature>.ts`.
- **Every query takes the owner's id** and filters by it. Reads return `null`
  or empty, and writes return `not_found`, for rows that exist but belong to
  someone else. Callers can't tell the two cases apart.
- **Every entry point authenticates first.** Pages, server actions, and route
  handlers call `requireUser()` (or `getCurrentUser()` in route handlers, which
  return 401). The proxy redirect is a UX shortcut, never the check.
- **Input is untrusted.** Actions accept `unknown`, parse with the same zod
  schema the form uses, and validate ids as UUIDs. Search params are parsed
  with `.catch()` fallbacks, so a bad URL degrades to defaults instead of
  throwing.
- **Narrow return shapes.** Queries select explicit columns. Password hashes
  and sealed secrets never leave the module that needs them.
- **Isolation is tested per feature.** Every DAL has a test in which a second
  user tries to read, list, update, move, or delete the first user's data, and
  action tests include ids smuggled into payloads.

## Consequences

- New tables follow the same pattern: a `user_id` FK with an index, a queries
  module, and an isolation test.
- Cross-user features (sharing, teams) would need an explicit design change,
  not a quiet query tweak.
