import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { PASSWORD, signUp } from './helpers'

/**
 * Headless Chromium has no push service (and reports notifications as
 * denied), so the browser's PushManager and permission are replaced with an
 * in-page fake. Everything server-side is real: the
 * subscription is saved, listed, and removed through the app.
 */
async function fakePushManager(context: BrowserContext) {
  await context.grantPermissions(['notifications'])
  await context.addInitScript(() => {
    // Headless Chromium reports notifications as denied whatever is granted.
    Object.defineProperty(Notification, 'permission', { get: () => 'granted' })
    Notification.requestPermission = async () => 'granted'
    let current: unknown = null
    const keys = {
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    }
    PushManager.prototype.getSubscription = async () => current as PushSubscription | null
    PushManager.prototype.subscribe = async (options?: PushSubscriptionOptionsInit) => {
      const endpoint = `https://push.invalid/e2e/${crypto.randomUUID()}`
      const key = options?.applicationServerKey as Uint8Array
      current = {
        endpoint,
        options: { applicationServerKey: key.buffer.slice(0) },
        toJSON: () => ({ endpoint, expirationTime: null, keys }),
        unsubscribe: async () => {
          current = null
          return true
        },
      }
      return current as PushSubscription
    }
  })
}

const section = (page: Page) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: 'Notifications' }) })

test('turn reminders on for this device, test them, and turn them off', async ({
  page,
  context,
}) => {
  await fakePushManager(context)
  await page.goto('/settings')
  const notifications = section(page)
  await expect(notifications.getByText('Off for this device')).toBeVisible()

  await notifications.getByRole('button', { name: 'Turn on for this device' }).click()
  await expect(page.getByText('Reminders are on for this device')).toBeVisible()
  await expect(notifications.getByText('On for this device')).toBeVisible()
  await expect(notifications.getByRole('listitem').filter({ hasText: 'This device' })).toBeVisible()

  // The fake endpoint can't be reached, so the app says so.
  await notifications.getByRole('button', { name: 'Send a test' }).click()
  await expect(
    page.getByText('The test couldn’t be delivered. Your devices may be offline.'),
  ).toBeVisible()

  await notifications.getByRole('button', { name: 'Turn off' }).click()
  await expect(page.getByText('Reminders are off for this device')).toBeVisible()
  await expect(notifications.getByText('Off for this device')).toBeVisible()
  await expect(notifications.getByRole('listitem').filter({ hasText: 'This device' })).toHaveCount(
    0,
  )
})

test('signing out forgets this device', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  await fakePushManager(context)
  const page = await context.newPage()
  const { email } = await signUp(page)

  await page.goto('/settings')
  await section(page).getByRole('button', { name: 'Turn on for this device' }).click()
  await expect(section(page).getByText('On for this device')).toBeVisible()

  await page.getByRole('button', { name: new RegExp(email) }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/settings')
  await expect(section(page).getByText('Off for this device')).toBeVisible()
  await expect(section(page).getByRole('listitem')).toHaveCount(0)
  await context.close()
})

test('on iPhone, Settings explains that Workbench must be on the Home Screen first', async ({
  browser,
}) => {
  const context = await browser.newContext({
    storageState: 'playwright/.auth/user.json',
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  })
  // Safari only exposes push to installed web apps.
  await context.addInitScript(() => {
    delete (window as { PushManager?: unknown }).PushManager
  })
  const page = await context.newPage()
  await page.goto('/settings')
  await expect(
    section(page).getByText(/reminders work once Workbench is on your Home Screen/),
  ).toBeVisible()
  await expect(
    page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'App' }) })
      .getByText('In Safari, tap Share.'),
  ).toBeVisible()
  await context.close()
})
