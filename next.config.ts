import type { NextConfig } from 'next'

import { CLIENT_CACHE_SECONDS } from './src/lib/revalidation'

/**
 * Static security headers for every response. The Content-Security-Policy is
 * not here: it carries a per-request nonce, so it is set in `src/proxy.ts`.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keeps screenshots used for design review free of the floating dev badge.
  devIndicators: false,
  reactStrictMode: true,
  // Every page is per-user and must be dynamically rendered so the CSP nonce can
  // be applied. Cache Components (PPR) prerenders a static shell, which cannot
  // carry a nonce. See docs/adr/0001-dynamic-rendering-and-strict-csp.md.
  cacheComponents: false,
  serverExternalPackages: ['bullmq', 'ioredis'],
  experimental: {
    // Keep visited pages in the client cache so revisits paint instantly; the
    // app shell then refreshes them in the background (stale-while-revalidate).
    // Mutations purge this cache via revalidatePath, and cookie changes (sign
    // in/out, password change) purge it too. See ADR 0008.
    staleTimes: { dynamic: CLIENT_CACHE_SECONDS },
    serverActions: {
      // Company logos are uploaded through a server action (max 512 KB).
      bodySizeLimit: '1mb',
    },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
