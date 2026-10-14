import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('signed out', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('the landing page presents the product and routes to auth', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: /in one place/ })).toBeVisible()

    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.map((v) => `${v.id} (${v.impact})`),
      'axe violations',
    ).toEqual([])

    await page.getByRole('link', { name: 'Create your account' }).first().click()
    await expect(page).toHaveURL(/\/signup$/)
    await page.goBack()
    await page.getByRole('banner').getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/login$/)

    // The app itself stays guarded.
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login\?next=/)
  })
})

test('a signed-in visit to the landing page lands on the dashboard', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible()
})
