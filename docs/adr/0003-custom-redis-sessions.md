# 0003. A small custom session layer on Redis instead of Auth.js

- Status: accepted
- Date: 2026-10-07

## Context

Workbench needs email and password sign-in, sessions stored in Redis,
httpOnly/secure/SameSite cookies, argon2id hashing, login rate limiting, and the
ability to revoke sessions (sign out everywhere after a password change).

Auth.js's credentials provider only supports JWT sessions. A JWT can't be
revoked server-side, and we would still write the password hashing, the rate
limiting, and the user table ourselves. Most of what Auth.js offers (OAuth
providers, adapters) we do not need.

## Decision

A small, fully tested session layer in `src/server/auth/`:

- **Token.** 256 random bits, base64url, sent only in an httpOnly,
  `SameSite=Lax`, `Path=/` cookie. The cookie is `Secure` and uses the
  `__Host-` prefix whenever `APP_URL` is https.
- **Storage.** Redis key `wb:sess:<sha256(token)>` holds `{ userId, createdAt,
ip, userAgent }` with a 30-day TTL. The TTL slides forward once half of it has
  been used. A per-user set allows revoking every session at once. A Redis
  dump contains no usable tokens.
- **Passwords.** argon2id (19 MiB, t=2, p=1) via `@node-rs/argon2`. Unknown
  emails are verified against a dummy hash so timing does not reveal which
  accounts exist, and the error message is the same in both cases.
- **Rate limits.** Fixed windows in Redis (one atomic Lua call): 5 attempts per
  15 minutes per email+IP, 30 per IP, and 5 signups per hour per IP. Identifiers
  are hashed before they become keys.
- **Authorization.** `proxy.ts` only checks that the cookie exists, as a UX
  redirect. `requireUser()` validates the session against Redis and loads the
  user. Every page, server action, and route handler calls it. It is
  memoized per request with React `cache`.
- **CSRF.** Mutations are server actions: POST only, with Next.js's
  Origin/Host check and SameSite cookies. No mutating GET route handlers exist.

## Consequences

- One Redis lookup and one indexed Postgres read per request. Both are cheap.
- If Redis is unavailable, nobody can sign in. This is acceptable for a
  personal platform, and `/api/health` reports it.
