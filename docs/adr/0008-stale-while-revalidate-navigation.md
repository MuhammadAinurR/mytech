# 0008. Stale-while-revalidate between pages

- Status: superseded by [0009](0009-view-cache-for-navigation.md)
- Date: 2026-10-07

## Context

Every page is dynamically rendered (ADR 0001). With Cache Components off,
Next.js keeps dynamic pages in the client cache for 0 seconds by default. So
switching from Invoices to Companies and back refetched Invoices from scratch
and showed its loading skeleton every time, even though the data had just been
on screen. The usual expectation is to show the last known data immediately,
refresh it in the background, and update in place.

## Decision

- **Cache visited pages on the client** for 15 minutes
  (`experimental.staleTimes.dynamic`, set from `CLIENT_CACHE_SECONDS` in
  `src/lib/revalidation.ts`). A revisit paints the cached payload with no
  skeleton.
- **Revalidate in the background.** `BackgroundRevalidate`, mounted once in
  the app shell, tracks when each URL was last loaded in this tab. On a
  revisit painted from cache (loaded 2 seconds to 15 minutes ago) it calls
  `router.refresh()`. That runs inside a transition, so the current content
  stays until the fresh payload replaces it, and client state (open dialogs,
  form input) is kept.
- **Revalidate on focus.** When the browser tab becomes visible again after
  sitting for at least a minute, the current page refreshes the same way.
  This picks up changes from other tabs or devices, and entries the worker
  generated.
- First visits, and revisits after the cache window, fetch fresh and show the
  skeleton, because there is nothing to show yet.

## Why this is safe

- **Our own changes are never shown stale.** Every mutation calls
  `revalidatePath`, which purges the client cache.
- **Data never crosses users.** Signing in, signing out, and changing a
  password all set or delete cookies, which purge the client cache.
- **The board isn't disrupted.** It defers applying refreshed server data
  while a card is being dragged.

## Consequences

- A revisit costs one background request instead of a blocking one. The
  number of requests is unchanged; what changes is what the user waits on.
- `staleTimes` is still an experimental Next.js option. If it changes, the
  e2e test in `e2e/navigation.spec.ts` (no skeleton on revisit, background
  update arrives) will catch it.

## Why it was superseded

It didn't work past the first revisit. `router.refresh()` is documented as
clearing the client cache for the current route, but in Next.js 16.4 it bumps
a global version (`invalidateBfCache`), which drops every cached page. So each
background refresh emptied the cache, and the next tab switch showed the
skeleton again. Mutations (`revalidatePath`) do the same. The e2e test only
checked a single revisit, so it missed this. The router cache also has no
stale-while-revalidate mode for dynamic pages: a navigation either reuses an
entry without refetching or refetches behind the loading boundary.
