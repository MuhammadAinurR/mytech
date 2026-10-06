import { expect, test } from '@playwright/test'

test('command palette navigates and switches theme from the keyboard', async ({ page }) => {
  await page.goto('/dashboard')
  const input = page.getByPlaceholder('Search or jump to…')
  // Retry until the shortcut listener is attached after hydration.
  await expect(async () => {
    await page.keyboard.press('ControlOrMeta+k')
    await expect(input).toBeFocused({ timeout: 500 })
  }).toPass()
  await input.fill('dark')
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(input).toBeHidden()

  await page.getByRole('button', { name: 'Search' }).first().click()
  await input.fill('settings')
  await expect(page.getByText('Nothing matches that search.')).toBeVisible()
})

test('sidebar marks the current page and offers a skip link', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused()
})

test('unknown pages inside the app render a calm not-found state', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByText('This page doesn’t exist')).toBeVisible()
})
