'use client'

import { useEffect } from 'react'

/**
 * Registers /sw.js once the page has loaded. In development it registers with
 * ?mode=dev, which turns off asset caching so hot reloads are never stale.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const url = process.env.NODE_ENV === 'development' ? '/sw.js?mode=dev' : '/sw.js'
    const register = () => {
      navigator.serviceWorker.register(url, { scope: '/', updateViaCache: 'none' }).catch(() => {
        // Not fatal: the app works without it, minus offline and push.
      })
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])
  return null
}
