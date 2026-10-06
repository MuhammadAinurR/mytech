import { describe, expect, it } from 'vitest'

import { buildContentSecurityPolicy, createNonce } from './csp'

describe('buildContentSecurityPolicy', () => {
  it('locks scripts to the request nonce in production', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'abc123', isDev: false })
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('allows eval and websockets only in development', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'n', isDev: true })
    expect(csp).toContain("'unsafe-eval'")
    expect(csp).toContain("connect-src 'self' ws:")
    expect(csp).not.toContain('upgrade-insecure-requests')
  })
})

describe('createNonce', () => {
  it('returns a fresh base64 value each call', () => {
    const a = createNonce()
    const b = createNonce()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(atob(a)).toHaveLength(16)
  })
})
