import { expect, test } from '@playwright/test'

test('pages are served with a nonce-based CSP and security headers', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  const headers = response?.headers() ?? {}
  expect(headers['content-security-policy']).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  )
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['x-powered-by']).toBeUndefined()
})

test('health endpoint responds', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok()).toBe(true)
})
