import { expect, request as playwrightRequest, test } from '@playwright/test'

test('the manifest, icons, and service worker load without a session', async ({ baseURL }) => {
  // Browsers fetch the manifest without cookies, so none of this may redirect to /login.
  const anonymous = await playwrightRequest.newContext({ baseURL })
  const manifest = await anonymous.get('/manifest.webmanifest', { maxRedirects: 0 })
  expect(manifest.status()).toBe(200)
  const body = (await manifest.json()) as {
    name: string
    display: string
    start_url: string
    icons: { src: string; purpose: string }[]
  }
  expect(body).toMatchObject({ name: 'Workbench', display: 'standalone', start_url: '/dashboard' })
  expect(body.icons.map((icon) => icon.purpose).sort()).toEqual(['any', 'any', 'maskable'])
  for (const icon of [...body.icons.map((i) => i.src), '/icons/apple-touch-icon.png']) {
    const response = await anonymous.get(icon, { maxRedirects: 0 })
    expect(response.status(), icon).toBe(200)
    expect(response.headers()['content-type']).toBe('image/png')
  }

  const worker = await anonymous.get('/sw.js', { maxRedirects: 0 })
  expect(worker.status()).toBe(200)
  expect(worker.headers()['cache-control']).toContain('no-cache')
  expect((await anonymous.get('/offline.html', { maxRedirects: 0 })).status()).toBe(200)
  await anonymous.dispose()
})

test('pages link the manifest and Apple icon, and work offline with a fallback', async ({
  page,
  context,
}) => {
  await page.goto('/dashboard')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/manifest.webmanifest',
  )
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/icons/apple-touch-icon.png',
  )

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(new URL(scope).pathname).toBe('/')
  // The worker controls pages loaded after it activates.
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)

  await context.setOffline(true)
  await page.goto('/transactions').catch(() => {})
  await expect(page.getByRole('heading', { name: 'You’re offline' })).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('link', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible()
})
