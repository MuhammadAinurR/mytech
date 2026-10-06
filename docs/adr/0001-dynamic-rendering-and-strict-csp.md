# 0001. Dynamic rendering with a nonce-based CSP

- Status: accepted
- Date: 2026-10-07

## Context

Next.js 16 scaffolds new apps with `cacheComponents` (Partial Prerendering) on.
PPR serves a prerendered static shell, then streams dynamic content into it.
Workbench is a private, per-user app: almost every page reads the session, and
the requirements call for a strict Content-Security-Policy.

A strict CSP needs a fresh nonce per request so that only scripts we emit can run.
A prerendered static shell cannot carry a per-request nonce, so the Next.js docs
list PPR as incompatible with nonce-based CSP.

## Decision

- Disable `cacheComponents` and render every route dynamically. The root layout
  reads request headers, which opts the whole tree into dynamic rendering.
- `src/proxy.ts` generates a 128-bit nonce per request and sets
  `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`,
  `base-uri 'none'`, `frame-ancestors 'none'`, and `form-action 'self'`.
  Next.js reads the nonce from the request header and applies it to its scripts.
- Styles allow `'unsafe-inline'`. UI primitives (popover positioning, drag
  transforms) set inline style attributes, which a nonce cannot cover, and style
  injection cannot execute script.
- Static security headers (`nosniff`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS, COOP/CORP) are set in `next.config.ts`.

## Consequences

- No static shell or ISR. That costs nothing here, because there is no
  public, cacheable content.
- Every new inline script must use the nonce from the `x-nonce` request header
  (for example the `next-themes` script).
- Route handlers under `/api` are excluded from the proxy matcher. They return
  JSON or files, not HTML, and keep the static security headers.
