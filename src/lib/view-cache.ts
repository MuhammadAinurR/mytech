import type { ReactNode } from 'react'

/** A page body as the server last rendered it. */
export type ViewEntry = { readonly node: ReactNode }

/**
 * Rendered page bodies for one browser tab, keyed by canonical URL. Pages read
 * it to paint a revisit instantly while the fresh render streams in. See ADR
 * 0009.
 */
export type ViewCache = {
  get(key: string): ViewEntry | undefined
  /**
   * Stores a fresh render. `source` is the promise it resolved from, `owner`
   * the mounted view that stored it.
   */
  set(key: string, source: object, node: ReactNode, owner: object): ViewEntry
  /**
   * Whether another view already stored this render, i.e. Next is replaying
   * it on back/forward. The same view storing it twice (React's StrictMode
   * re-running effects in development) is not a replay.
   */
  isReplay(source: object, owner: object): boolean
}

/** Enough for every page and a few filter states, small enough to forget about. */
export const VIEW_CACHE_LIMIT = 30

export function createViewCache(limit = VIEW_CACHE_LIMIT): ViewCache {
  const entries = new Map<string, ViewEntry>()
  const storedBy = new WeakMap<object, object>()

  return {
    get: (key) => entries.get(key),
    set(key, source, node, owner) {
      storedBy.set(source, owner)
      const entry = { node }
      // Re-insert so the map iterates from the least recently stored entry.
      entries.delete(key)
      entries.set(key, entry)
      for (const oldest of entries.keys()) {
        if (entries.size <= limit) break
        entries.delete(oldest)
      }
      return entry
    },
    isReplay(source, owner) {
      const by = storedBy.get(source)
      return by !== undefined && by !== owner
    },
  }
}
