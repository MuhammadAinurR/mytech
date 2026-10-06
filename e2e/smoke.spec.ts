import { expect, test } from '@playwright/test'

test('pages are served with a nonce-based CSP and security headers', async ({ request }) => {
  const response = await request.get('/login')
  expect(response.status()).toBe(200)
  const headers = response.headers()
  expect(headers['content-security-policy']).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  )
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['x-powered-by']).toBeUndefined()
})

test('protected routes redirect to login without a session', async ({ request }) => {
  const response = await request.get('/transactions?page=2', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers().location).toMatch(/\/login\?next=%2Ftransactions%3Fpage%3D2$/)
})

test('health endpoint reports Postgres and Redis', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({
    status: 'ok',
    checks: { postgres: 'ok', redis: 'ok' },
  })
})
