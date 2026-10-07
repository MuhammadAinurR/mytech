'use client'

import { useRouter } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  startTransition,
  Suspense,
  use,
  useEffect,
  useState,
} from 'react'

import { createViewCache, type ViewCache, type ViewEntry } from '@/lib/view-cache'

const ViewCacheContext = createContext<ViewCache | null>(null)

/**
 * One view cache per signed-in tab. The app layout keys this by user id, so
 * signing in as someone else starts from an empty cache.
 */
export function ViewCacheProvider({ children }: { children: ReactNode }) {
  const [cache] = useState(() => createViewCache())
  return <ViewCacheContext value={cache}>{children}</ViewCacheContext>
}

/**
 * Stale-while-revalidate for a server-rendered page body (ADR 0009).
 *
 * The page passes its body as a promise, which streams in after the page shell.
 * If this tab has shown `cacheKey` before, that render paints immediately and
 * the fresh one replaces it in place when it arrives; React keeps client state
 * (open dialogs, the board) because the trees match. When only the search
 * params change, the previous results stay up until the new ones land. Only a
 * first visit shows `fallback`.
 */
export function CachedView({
  cacheKey,
  content,
  fallback,
}: {
  /** Canonical URL of what `content` renders, without UI-only params. */
  cacheKey: string
  content: Promise<ReactNode>
  fallback: ReactNode
}) {
  return (
    <Suspense fallback={fallback}>
      <View cacheKey={cacheKey} content={content} />
    </Suspense>
  )
}

function View({ cacheKey, content }: { cacheKey: string; content: Promise<ReactNode> }) {
  const cache = use(ViewCacheContext)
  if (cache === null) throw new Error('CachedView needs a ViewCacheProvider')
  const router = useRouter()

  // What this mount shows until fresh content arrives: on mount, the last
  // render of this URL from an earlier visit, if any.
  const [shown, setShown] = useState<{ key: string; entry: ViewEntry | undefined }>(() => ({
    key: cacheKey,
    entry: cache.get(cacheKey),
  }))
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  // Identifies this mount to the cache; kept when StrictMode re-runs effects.
  const [owner] = useState(() => ({}))

  useEffect(() => {
    // Back/forward replays the payload Next kept for this page, which an
    // earlier visit already showed (or older). Ask the server for a fresh one.
    if (cache.isReplay(content, owner)) {
      router.refresh()
      return
    }
    let current = true
    content.then(
      (node) => {
        if (!current) return
        const entry = cache.set(cacheKey, content, node, owner)
        // A transition, so if part of the new tree is still streaming React
        // keeps the current content up instead of falling back to a skeleton.
        startTransition(() => setShown({ key: cacheKey, entry }))
      },
      (error: unknown) => {
        if (current) setFailure({ error })
      },
    )
    return () => {
      current = false
    }
  }, [cache, cacheKey, content, owner, router])

  // A failed refresh goes to the error boundary rather than leaving stale
  // figures on screen as if they were current.
  if (failure) throw failure.error

  // Search params changed in place: show this URL's last render if there is
  // one, otherwise keep the previous results up while the new ones load.
  const entry = shown.key === cacheKey ? shown.entry : (cache.get(cacheKey) ?? shown.entry)
  return entry ? entry.node : use(content)
}
