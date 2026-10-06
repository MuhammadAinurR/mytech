import { NextResponse, type NextRequest } from 'next/server'

import { buildContentSecurityPolicy, createNonce } from '@/lib/csp'
import { SESSION_COOKIE_NAMES } from '@/lib/session-cookie'

// Routes reachable without a session. Everything else requires one.
const PUBLIC_PATHS = ['/login', '/signup', '/styleguide']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * Runs before every page request:
 * 1. Optimistic auth: no session cookie on a protected route → /login. This is
 *    a UX shortcut only; every page and action still calls requireUser().
 * 2. Generates the per-request CSP nonce Next.js applies to its scripts.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name))

  if (!hasSession && !isPublic(pathname)) {
    const login = new URL('/login', request.url)
    if (pathname !== '/') login.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(login)
  }

  const nonce = createNonce()
  const csp = buildContentSecurityPolicy({ nonce, isDev: process.env.NODE_ENV === 'development' })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|svg|ico|woff2?)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
