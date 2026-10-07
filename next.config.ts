import type { NextConfig } from 'next'

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
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        // The browser checks for a new worker on every navigation; never cache it.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      },
      {
        // Static fallback page: no scripts at all.
        source: '/offline.html',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
