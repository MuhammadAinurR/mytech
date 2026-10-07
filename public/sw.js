/* Workbench service worker. Plain JS: it is served as-is from /sw.js.
 *
 * Caching is deliberately small. Pages and data are private and always come
 * from the network; only hashed build assets and icons are cached, and an
 * offline page stands in when a navigation can't reach the server.
 * Registered with ?mode=dev during development, where nothing is cached.
 */
const VERSION = 'v1'
const STATIC_CACHE = `wb-static-${VERSION}`
const OFFLINE_URL = '/offline.html'
const DEV = new URL(self.location.href).searchParams.get('mode') === 'dev'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('wb-') && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Pages: always the network; the offline page only when it can't be reached.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached ?? Response.error()),
      ),
    )
    return
  }

  // Content-hashed build output and icons never change under the same URL.
  const immutable = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
  if (immutable && !DEV) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) await cache.put(request, response.clone())
        return response
      }),
    )
  }
})

/* Push notifications (invoice reminders). The payload is a PushMessage:
 * { title, body, url, tag }; see src/features/notifications/lib/reminders.ts. */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Workbench', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      // Same tag replaces instead of stacking (e.g. a summary seen twice).
      tag: data.tag,
      data: { url: data.url || '/dashboard' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Only ever open our own pages.
  const target = new URL(event.notification.data?.url || '/dashboard', self.location.origin)
  const url = target.origin === self.location.origin ? target.href : self.location.origin
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (open) {
        await open.focus()
        if ('navigate' in open) await open.navigate(url)
        return
      }
      await self.clients.openWindow(url)
    }),
  )
})
