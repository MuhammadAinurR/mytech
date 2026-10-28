import { expect, test, type Page } from '@playwright/test'

test('the dashboard shows money in and out by month with an accessible chart', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /^Net in / })).toBeVisible()

  const chart = page.getByRole('figure')
  await expect(chart.getByText('Money in and out', { exact: true })).toBeVisible()
  // The table view mirrors every month: six back, this one included, and six ahead.
  await expect(chart.getByRole('table', { name: /Money in and out/ }).getByRole('row')).toHaveCount(
    13,
  )
  // Each month is focusable and announces its numbers.
  await expect(chart.getByRole('button', { name: /^\w+ \d{4}: .*in .*, out / })).toHaveCount(12)

  for (const section of [
    'Recent transactions',
    'Coming up',
    'Unpaid invoices',
    'Ongoing projects',
  ]) {
    await expect(page.getByRole('heading', { name: section })).toBeVisible()
  }

  // Nothing widens a phone screen (a table once did, under sr-only).
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0)
})

async function addRule(
  page: Page,
  rule: { name: string; amount: string; currency: string; yearlyIn?: string },
) {
  await page.goto('/transactions/recurring?new=1')
  const dialog = page.getByRole('dialog', { name: 'New recurring rule' })
  await dialog.getByLabel('Name').fill(rule.name)
  await dialog.getByLabel('Amount').fill(rule.amount)
  await dialog.getByLabel('Currency').selectOption(rule.currency)
  await dialog.getByLabel('Category').fill('Hosting')
  if (rule.yearlyIn) {
    await dialog.getByRole('radio', { name: 'Yearly' }).click()
    await dialog.getByLabel('Month').selectOption({ label: rule.yearlyIn })
  }
  await dialog.getByLabel('Day').selectOption('15')
  await dialog.getByRole('button', { name: 'Create rule' }).click()
  await expect(page.getByText('Rule created')).toBeVisible()
}

test('recurring rules forecast what is coming, and when', async ({ page }) => {
  // No other test uses SGD, so its totals here are this test's own.
  const stamp = Date.now()
  const server = `Forecast VPS ${stamp}`
  const domain = `Forecast domain ${stamp}`
  const later = new Date()
  later.setMonth(later.getMonth() + 4, 1)
  await addRule(page, { name: server, amount: '25', currency: 'SGD' })
  await addRule(page, {
    name: domain,
    amount: '120',
    currency: 'SGD',
    yearlyIn: later.toLocaleString('en-US', { month: 'long' }),
  })
  // In the dashboard's own currency, so the chart shows it ahead.
  await addRule(page, { name: `Forecast tool ${stamp}`, amount: '7.77', currency: 'USD' })

  await page.goto('/dashboard')
  const section = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Coming up' }) })
  // Twelve monthly bills and one renewal over the next 12 months.
  const year = section.locator('div').filter({ hasText: /^To pay in 12 months · SGD/ })
  await expect(year).toContainText('420.00')
  await expect(section.getByRole('listitem').filter({ hasText: server }).first()).toContainText(
    '25.00',
  )
  await expect(section.getByRole('heading', { name: 'Yearly renewals' })).toBeVisible()
  await expect(section.getByRole('listitem').filter({ hasText: domain })).toContainText('120.00')

  const table = page.getByRole('figure').getByRole('table', { name: /Money in and out/ })
  await expect(table.getByRole('row').filter({ hasText: '$7.77' })).not.toHaveCount(0)
})
