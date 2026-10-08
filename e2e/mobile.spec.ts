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

test('transactions on a phone: grouped by day, a row menu, and delete from the sheet', async ({
  page,
}) => {
  const name = `Phone list ${Date.now()}`
  await page.goto('/transactions?new=1')
  const sheet = page.getByRole('dialog', { name: 'New transaction' })
  await sheet.getByLabel('Amount').fill('12.50')
  await sheet.getByLabel('Category').fill(name)
  await sheet.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByText('Transaction added')).toBeVisible()

  const today = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Today' }) })
  const row = today.getByRole('button', { name: new RegExp(name) })
  await expect(row).toHaveCount(1)

  // Long-press on touch, right-click with a mouse: the same menu.
  await row.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(sheet.getByLabel('Category')).toHaveValue(name)
  await sheet.getByRole('button', { name: 'Add transaction' }).click()
  await expect(today.getByRole('button', { name: new RegExp(name) })).toHaveCount(2)

  // Tap to edit; phones delete from the sheet.
  await today
    .getByRole('button', { name: new RegExp(name) })
    .first()
    .click()
  const edit = page.getByRole('dialog', { name: 'Edit transaction' })
  await edit.getByRole('button', { name: 'Delete transaction' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Transaction deleted')).toBeVisible()
  await expect(today.getByRole('button', { name: new RegExp(name) })).toHaveCount(1)
})

test('invoices on a phone: save from the title bar, step the status, act from the menu', async ({
  page,
}) => {
  const stamp = Date.now()
  const companyName = `Phone Co ${stamp}`
  const client = `Phone Client ${stamp}`
  await page.goto('/companies?new=1')
  const companyDialog = page.getByRole('dialog', { name: 'New company' })
  await companyDialog.getByLabel('Name').fill(companyName)
  await companyDialog.getByLabel('Number prefix').fill(`P${String(stamp).slice(-6)}-`)
  await companyDialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()

  // The form's own footer is hidden on phones; the glass check saves.
  await page.goto('/invoices/new')
  await page.getByLabel('Company').selectOption({ label: companyName })
  await page.getByLabel('Client name').fill(client)
  await page.getByLabel('Line 1 description').fill('Discovery')
  await page.getByLabel('Line 1 unit price').fill('400')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  const invoiceUrl = page.url()

  // The next step is one full-width tap; the rest sits behind "…".
  await page.getByRole('button', { name: 'Invoice actions' }).click()
  for (const item of ['Print', 'Download PDF', 'Edit', 'Mark as paid', 'Delete draft']) {
    await expect(page.getByRole('menuitem', { name: item })).toBeVisible()
  }
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(page.getByText('Marked as sent')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeVisible()
  await page.getByRole('button', { name: 'Invoice actions' }).click()
  await expect(page.getByRole('menuitem', { name: 'Move back to draft' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.impact})`)).toEqual([])

  // The list is rows, not a table, and a row opens the invoice.
  await page.goto('/invoices')
  await expect(page.getByRole('table')).toBeHidden()
  await page.getByRole('link', { name: new RegExp(client) }).click()
  await expect(page).toHaveURL(invoiceUrl)
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
  for (const path of [
    '/dashboard',
    '/transactions',
    '/transactions/recurring',
    '/transactions/renewals',
    '/invoices',
    '/invoices/new',
    '/more',
    '/companies',
    '/settings',
  ]) {
    await page.goto(path)
    await expect(tabs(page)).toBeVisible()
    // Scan the page, not the skeleton it streams into.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
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
