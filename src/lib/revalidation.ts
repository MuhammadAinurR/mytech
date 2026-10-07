/** Refresh on tab focus only if the page has been sitting at least this long. */
export const FOCUS_REFRESH_AFTER_MS = 60_000

/**
 * Should returning to the browser tab refresh the current page? Navigations
 * always fetch fresh data, so only a page left open for a while can be behind
 * work done elsewhere (another tab, the worker).
 */
export function shouldRefreshOnFocus(lastLoadedAt: number | undefined, now: number): boolean {
  return lastLoadedAt !== undefined && now - lastLoadedAt >= FOCUS_REFRESH_AFTER_MS
}
