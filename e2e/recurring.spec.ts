import { expect, test } from '@playwright/test'

test('create, preview, pause, and delete a recurring rule', async ({ page }) => {
  const name = `Office rent ${Date.now()}`
  await page.goto('/transactions/recurring')
  await page.getByRole('button', { name: 'New rule' }).first().click()

  const dialog = page.getByRole('dialog', { name: 'New recurring rule' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByLabel('Amount').fill('3,500,000')
  await dialog.getByLabel('Currency').selectOption('IDR')
  await dialog.getByLabel('Category').fill('Rent')
  await dialog.getByLabel('Day').selectOption('31')
  await dialog.getByLabel('Starts').fill('2031-01-01')
  // Month-end clamping is visible before saving.
  await expect(dialog.getByText('Next: Jan 31, 2031, Feb 28, 2031, Mar 31, 2031.')).toBeVisible()
  await dialog.getByLabel('Reminder').fill('5')
  await dialog.getByRole('button', { name: 'Create rule' }).click()
  await expect(page.getByText('Rule created')).toBeVisible()

  const row = page.getByRole('row', { name: new RegExp(name) })
  await expect(row).toContainText('Monthly on the 31st')
  await expect(row).toContainText('reminds 5 days before')
  await expect(row).toContainText('−Rp 3,500,000')

  await row.hover()
  await row.getByRole('button', { name: `Actions for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Pause' }).click()
  await expect(page.getByText('Rule paused')).toBeVisible()
  await expect(row).toContainText('Paused')

  await row.hover()
  await row.getByRole('button', { name: `Actions for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete rule' }).click()
  await expect(page.getByText('Rule deleted. Entries it already created were kept.')).toBeVisible()
  await expect(row).toBeHidden()
})

test('a yearly rule requires a month', async ({ page }) => {
  await page.goto('/transactions/recurring?new=1')
  const dialog = page.getByRole('dialog', { name: 'New recurring rule' })
  await dialog.getByRole('radio', { name: 'Yearly' }).click()
  await dialog.getByRole('button', { name: 'Create rule' }).click()
  await expect(dialog.getByText('Choose a month.')).toBeVisible()
  await expect(dialog.getByText('Name this rule.')).toBeVisible()
})

test('renewals tab lists the next 90 days', async ({ page }) => {
  await page.goto('/transactions/renewals')
  await expect(page.getByRole('link', { name: 'Renewals' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText(/Everything your rules will create/)).toBeVisible()
})
