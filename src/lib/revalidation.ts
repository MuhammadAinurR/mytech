/**
 * Stale-while-revalidate for page navigation.
 *
 * The App Router keeps a visited page's server payload in its client cache for
 * CLIENT_CACHE_SECONDS (next.config.ts → experimental.staleTimes.dynamic), so a
 * revisit paints the last known data instantly instead of a loading skeleton.
 * The client then refreshes that page in the background and swaps in fresh
 * data when it arrives.
 */
export const CLIENT_CACHE_SECONDS = 15 * 60

/** Revisits closer together than this are treated as fresh (no refetch). */
export const MIN_REFRESH_INTERVAL_MS = 2_000

/** Refresh on tab focus only if the page has been sitting at least this long. */
export const FOCUS_REFRESH_AFTER_MS = 60_000

/**
 * Should a navigation to a URL trigger a background refresh? Only when the
 * page was last loaded inside the client-cache window (so it was painted from
 * cache). Outside that window, or on a first visit, Next.js fetched it fresh.
 */
export function shouldRefreshOnVisit(
  lastLoadedAt: number | undefined,
  now: number,
  windowMs = CLIENT_CACHE_SECONDS * 1000,
): boolean {
  if (lastLoadedAt === undefined) return false
  const age = now - lastLoadedAt
  return age >= MIN_REFRESH_INTERVAL_MS && age < windowMs
}

export function shouldRefreshOnFocus(lastLoadedAt: number | undefined, now: number): boolean {
  return lastLoadedAt !== undefined && now - lastLoadedAt >= FOCUS_REFRESH_AFTER_MS
}
