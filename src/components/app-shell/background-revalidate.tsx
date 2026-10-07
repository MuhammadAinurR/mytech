'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { shouldRefreshOnFocus } from '@/lib/revalidation'

/**
 * Refreshes the current page when you return to the browser tab after a
 * minute, which picks up work done elsewhere (another tab, the worker
 * generating recurring entries). The refresh runs in a transition and pages
 * render through CachedView, so the current content stays on screen until the
 * fresh render replaces it.
 */
export function BackgroundRevalidate() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const loadedAt = useRef<number | undefined>(undefined)

  // Every navigation fetches the page fresh.
  useEffect(() => {
    loadedAt.current = Date.now()
  }, [pathname, search])

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (!shouldRefreshOnFocus(loadedAt.current, now)) return
      loadedAt.current = now
      router.refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [router])

  return null
}
