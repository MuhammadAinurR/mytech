import { NextResponse, type NextRequest } from 'next/server'

import { buildContentSecurityPolicy, createNonce } from '@/lib/csp'

/**
 * Runs before every page request. Generates the per-request CSP nonce, which
 * Next.js reads from the request's CSP header and applies to its own scripts.
 */
export function proxy(request: NextRequest) {
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
