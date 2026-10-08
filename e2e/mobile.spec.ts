import AxeBuilder from '@axe-core/playwright'
import { devices, expect, type Page, test } from '@playwright/test'

// A phone: the mobile shell replaces the sidebar below 768px.
test.use({ ...devices['Pixel 7'], viewport: { width: 393, height: 852 } })

const tabs = (page: Page) => page.getByRole('navigation', { name: 'Tabs' })

test('the tab bar switches sections and marks where you are', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('complementary')).toBeHidden()
  await expect(tabs(page).getByRole('link', { name: 'Home' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  for (const [tab, heading, url] of [
    ['Money', 'Transactions', /\/transactions$/],
    ['Invoices', 'Invoices', /\/invoices$/],
    ['Projects', 'Projects', /\/projects$/],
    ['More', 'More', /\/more$/],
  ] as const) {
    await tabs(page).getByRole('link', { name: tab }).click()
    await expect(page).toHaveURL(url)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(tabs(page).getByRole('link', { name: tab })).toHaveAttribute(
      'aria-current',
      'page',
    )
  }
})

test('More reaches the other sections, which lead back to More', async ({ page }) => {
  await page.goto('/more')
  for (const [row, heading] of [
    ['Credentials', 'Credentials'],
    ['Companies', 'Companies'],
    ['Settings', 'Settings'],
  ] as const) {
    await page.getByRole('link', { name: row, exact: true }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    // These pages live under More, so the More tab stays selected.
    await expect(tabs(page).getByRole('link', { name: 'More' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await page.getByRole('link', { name: 'Back to More' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'More' })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})

test('page actions float as glass buttons, and search opens the palette', async ({ page }) => {
  await page.goto('/transactions')
  // The glass "+" in the title bar (an empty month also offers one in the list).
  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  await expect(page.getByRole('dialog', { name: 'New transaction' })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByPlaceholder('Search or jump to…')).toBeFocused()
})

test('Home adds a transaction, an invoice, or a project in one tap', async ({ page }) => {
  await page.goto('/dashboard')
  const add = page.getByRole('region', { name: 'Add' })
  await add.getByRole('link', { name: 'New transaction' }).click()
  await expect(page.getByRole('dialog', { name: 'New transaction' })).toBeVisible()
  await page.goBack()
  await add.getByRole('link', { name: 'New invoice' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'New invoice' })).toBeVisible()
  await page.goBack()
  await add.getByRole('link', { name: 'New project' }).click()
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible()
})

test('the large title collapses into the title bar on scroll', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 480 })
  await page.goto('/more')
  const compact = page.locator('main p[aria-hidden]').filter({ hasText: /^More$/ })
  await expect(compact).toHaveCount(0)
  await page.mouse.wheel(0, 600)
  await expect(compact).toHaveCSS('opacity', '1')
})

test('the mobile shell has no accessibility violations', async ({ page }) => {
  for (const path of ['/dashboard', '/transactions', '/more', '/companies', '/settings']) {
    await page.goto(path)
    await expect(tabs(page)).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.map((v) => `${path}: ${v.id} (${v.impact})`),
      'axe violations',
    ).toEqual([])
  }
})

test.describe('on a desktop screen', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false })
  test('keeps the sidebar and hides the mobile shell', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('complementary')).toBeVisible()
    await expect(tabs(page)).toBeHidden()
  })
})
