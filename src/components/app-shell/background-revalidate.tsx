'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { shouldRefreshOnFocus, shouldRefreshOnVisit } from '@/lib/revalidation'

// When each URL's data was last loaded from the server, for this tab's session.
const loadedAt = new Map<string, number>()

/**
 * Keeps revisited pages fresh without loading states. A revisit is painted
 * from the client cache; this then calls router.refresh(), which re-renders the
 * page on the server inside a transition, so the current content stays on
 * screen until the fresh payload replaces it. Returning to the browser tab
 * after a minute does the same, which picks up work done elsewhere (e.g. the
 * worker generating recurring entries).
 */
export function BackgroundRevalidate() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const key = search ? `${pathname}?${search}` : pathname

  useEffect(() => {
    const now = Date.now()
    const refresh = shouldRefreshOnVisit(loadedAt.get(key), now)
    loadedAt.set(key, now)
    if (refresh) router.refresh()
  }, [key, router])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (!shouldRefreshOnFocus(loadedAt.get(key), now)) return
      loadedAt.set(key, now)
      router.refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [key, router])

  return null
}
