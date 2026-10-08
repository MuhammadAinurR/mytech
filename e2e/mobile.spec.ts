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

test('projects on a phone: one column at a time, a long press reorders, the menu moves', async ({
  page,
  context,
}) => {
  const stamp = Date.now()
  const first = `Phone project A ${stamp}`
  const second = `Phone project B ${stamp}`
  await page.goto('/projects')
  for (const name of [first, second]) {
    // The glass "+" in the title bar (an empty column offers one too).
    await page.getByRole('button', { name: 'New project' }).first().click()
    const dialog = page.getByRole('dialog', { name: 'New project' })
    await dialog.getByLabel('Name').fill(name)
    await dialog.getByRole('button', { name: 'Add project' }).click()
    await expect(dialog).toBeHidden()
  }

  // Ongoing is shown first; To do holds the new projects.
  const columns = page.getByRole('radiogroup', { name: 'Column' })
  await expect(columns.getByRole('radio', { name: /^Ongoing/ })).toBeChecked()
  await expect(page.getByText(first)).toBeHidden()
  await columns.getByRole('radio', { name: /^To do/ }).click()
  await expect(page.getByText(first)).toBeVisible()
  await expect(page.getByRole('region', { name: /^Ongoing/ })).toBeHidden()

  // A long press lifts the second card; dragging it up puts it first.
  const cdp = await context.newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    })
  const card = (name: string) => page.locator('article').filter({ hasText: name })
  const from = (await card(second).boundingBox())!
  const to = (await card(first).boundingBox())!
  const x = from.x + from.width / 2
  const y = from.y + from.height / 2
  await touch('touchStart', x, y)
  await page.waitForTimeout(400)
  for (let step = 1; step <= 10; step++) {
    await touch('touchMove', x, y + ((to.y + 8 - y) * step) / 10)
    await page.waitForTimeout(20)
  }
  const saved = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/projects'),
  )
  await touch('touchEnd')
  await saved
  await page.reload()
  await columns.getByRole('radio', { name: /^To do/ }).click()
  const order = await page.locator('[data-column="todo"] article').allTextContents()
  const at = (name: string) => order.findIndex((text) => text.includes(name))
  expect(at(second)).toBeLessThan(at(first))

  // The menu moves a card to a column off screen, and says so.
  await page.getByRole('button', { name: `Actions for ${first}` }).click()
  await page.getByRole('menuitem', { name: 'Ongoing' }).click()
  await page
    .getByRole('dialog', { name: 'When is it happening?' })
    .getByRole('button', { name: 'Start project' })
    .click()
  await expect(page.getByText('Moved to Ongoing')).toBeVisible()
  await expect(page.getByText(first)).toBeHidden()
  await columns.getByRole('radio', { name: /^Ongoing/ }).click()
  // Started today and due in 14 days, by the dates dialog's defaults.
  await expect(card(first)).toContainText('14 days left')

  await page.getByRole('link', { name: 'Calendar view' }).click()
  await expect(page).toHaveURL(/\/projects\/calendar$/)
  await expect(page.getByRole('button', { name: new RegExp(first) })).toContainText('14 days left')
})

test('credentials on a phone: reveal and copy from the row, tap to edit, long-press to delete', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const stamp = Date.now()
  const label = `Phone secret ${stamp}`
  const secret = `s3cret-${stamp}`
  await page.goto('/credentials')
  await page.getByRole('button', { name: 'Add credential' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'New credential' })
  await dialog.getByLabel('Name', { exact: true }).fill(label)
  await dialog.getByLabel('Username').fill('ops')
  await dialog.getByLabel('Secret', { exact: true }).fill(secret)
  await dialog.getByRole('button', { name: 'Save credential' }).click()
  await expect(page.getByText('Credential saved')).toBeVisible()
  await expect(page.getByRole('table')).toBeHidden()

  // A narrow screen shows the revealed secret in a popover.
  await page.getByRole('button', { name: `Reveal secret for ${label}` }).click()
  await expect(page.getByRole('dialog').getByText(secret)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText(secret)).toHaveCount(0)
  await page.getByRole('button', { name: `Copy secret for ${label}` }).click()
  await expect(page.getByText('Secret copied')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(secret)

  const row = page.getByRole('button', { name: new RegExp(`^${label}`) })
  await row.click()
  await expect(page.getByRole('dialog', { name: 'Edit credential' })).toBeVisible()
  await page.keyboard.press('Escape')
  // Long-press on touch, right-click with a mouse: the same menu.
  await row.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete credential' }).click()
  await expect(page.getByText('Credential deleted')).toBeVisible()
  await expect(row).toHaveCount(0)
})

test('companies and their clients on a phone: rows that open, menus that invoice', async ({
  page,
}) => {
  const stamp = Date.now()
  const company = `Phone Clients Co ${stamp}`
  const client = `Phone Client ${stamp}`
  await page.goto('/companies?new=1')
  const companyDialog = page.getByRole('dialog', { name: 'New company' })
  await companyDialog.getByLabel('Name').fill(company)
  await companyDialog.getByLabel('Number prefix').fill(`C${String(stamp).slice(-6)}-`)
  await companyDialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()
  await expect(page.getByRole('table')).toBeHidden()

  // A company without invoices can be deleted from its long-press menu.
  const companyRow = page.getByRole('link', { name: new RegExp(`^${company}`) })
  await companyRow.click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: 'New invoice' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await companyRow.click()
  await expect(page.getByRole('heading', { level: 1, name: company })).toBeVisible()

  await page.getByRole('button', { name: 'Add client' }).first().click()
  const clientDialog = page.getByRole('dialog', { name: 'New client' })
  await clientDialog.getByLabel('Name').fill(client)
  await clientDialog.getByLabel('Email').fill('ap@client.example')
  await clientDialog.getByRole('button', { name: 'Add client' }).click()
  await expect(page.getByText('Client added')).toBeVisible()

  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.map((v) => `${v.id} (${v.impact})`)).toEqual([])

  const clientRow = page.getByRole('button', { name: new RegExp(`^${client}`) })
  await clientRow.click()
  await expect(page.getByRole('dialog', { name: 'Edit client' })).toBeVisible()
  await page.keyboard.press('Escape')
  await clientRow.click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'New invoice' }).click()
  await expect(page).toHaveURL(/\/invoices\/new\?company=.+&client=/)
  await expect(page.getByLabel('Client name')).toHaveValue(client)
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
    '/projects',
    '/projects/calendar',
    '/more',
    '/credentials',
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
