# 0009. A client view cache for stale-while-revalidate navigation

- Status: accepted
- Date: 2026-10-07
- Supersedes: [0008](0008-stale-while-revalidate-navigation.md)

## Context

Switching pages should show the last data at once, fetch fresh data in the
background, and update in place, with no loading skeleton after the first
visit. ADR 0008 tried to get this from the Next.js router cache, but any
`router.refresh()` or `revalidatePath` empties that whole cache, and the router
has no stale-while-revalidate mode for dynamic pages.

Client data libraries (TanStack Query, SWR) solve this for client-fetched JSON.
Adopting one would mean moving every page's rendering to the client and adding
a read API next to the data-access layer.

## Decision

Keep the server-rendered pages and cache their rendered output on the client:

- **Pages stream their body as a promise.** A page awaits only
  `requireUser()` and its params, then renders
  `<CachedView cacheKey content={renderX(user, query)} fallback={skeleton} />`
  without awaiting `renderX`. The shell reaches the browser right away and the
  body streams in after it.
- **`CachedView` keeps the last body per URL.** `cacheKey` is the canonical URL
  of what the body renders, built from the parsed params, so `/transactions`
  and `/transactions?month=<this month>` share an entry and UI-only params
  like `?new=1` are ignored. A revisit renders the cached body immediately. When
  the fresh body arrives, it replaces the cached one inside a transition. React
  reconciles the two trees, so client state (open dialogs, the board) survives,
  and anything still streaming keeps the current content up instead of showing
  a fallback. Only a first visit shows the skeleton.
- **Filters keep the previous results.** Search params change the key in place
  (Next keeps the page mounted), so the current results stay up until the new
  ones land, or that URL's cached body shows if there is one.
- **Every navigation fetches fresh.** There are no route `loading.tsx` files and
  no `staleTimes`. A click keeps the current page until the new page's shell
  arrives, which is fast because the shell awaits no data.
- **Back/forward refreshes.** Next replays its copy of the page on history
  navigation. The cache recognizes a body another view already stored and calls
  `router.refresh()`. A repeat call from StrictMode re-running the same view's
  effect doesn't count.
- **Focus refreshes.** Returning to the browser tab after a minute refreshes the
  current page the same way (`BackgroundRevalidate`).

## Why this is safe

- **No data crosses users.** The cache lives in the app layout, keyed by user
  id, and is gone when you sign out (the layout unmounts) or sign in as
  someone else.
- **Stale data is never final.** Every navigation, mutation (`revalidatePath`
  re-renders the current page), back/forward, and long-unfocused tab fetches a
  fresh body. A cached body is on screen only until that arrives. A failed
  refresh goes to the error boundary instead of leaving old figures up.
- **Optimistic UI isn't undone.** The project board ignores incoming server data
  while a move is in progress (dragging, waiting for dates, or saving), and
  then applies the latest.
- **Forms aren't seeded from cache.** New/edit invoice and settings render
  directly, so editing always starts from current values.

## Consequences

- After your own change, other pages can show their pre-change data for a
  moment before updating. That's the stale-while-revalidate trade.
- A first visit costs two steps (shell, then body) instead of one, with the
  skeleton in between, as before.
- Memory: at most 30 rendered bodies per tab.
- `notFound()` inside a body still renders the not-found page. Because the
  status line has already been sent, it returns 200 instead of 404.
- `e2e/navigation.spec.ts` covers repeated switching, a revisit while the data
  is held up by a table lock (cached page first, then the update),
  back/forward, and filters.
