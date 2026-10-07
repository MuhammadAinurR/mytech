import { expect, test } from '@playwright/test'

test('the dashboard summarizes the month with an accessible chart', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: /^Net in / })).toBeVisible()

  const chart = page.getByRole('figure')
  await expect(chart.getByText('Net by month', { exact: true })).toBeVisible()
  // The table view mirrors every bar for screen readers.
  await expect(chart.getByRole('table', { name: /Net by month/ }).getByRole('row')).toHaveCount(7)
  // Each column is focusable and announces its numbers.
  await expect(chart.getByRole('button', { name: /: net .*income .*expense/ })).toHaveCount(6)

  for (const section of [
    'Recent transactions',
    'Due soon',
    'Unpaid invoices',
    'Ongoing projects',
  ]) {
    await expect(page.getByRole('heading', { name: section })).toBeVisible()
  }
})
