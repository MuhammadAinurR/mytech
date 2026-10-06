import { expect, test } from '@playwright/test'

// Each run uses a month far in the past so results never collide with other runs.
const month = `20${10 + Math.floor(Math.random() * 10)}-0${1 + Math.floor(Math.random() * 9)}`

test('add, edit, and delete a transaction with live monthly totals', async ({ page }) => {
  await page.goto(`/transactions?month=${month}`)
  await expect(page.getByText(/^No transactions in /)).toBeVisible()

  await page.getByRole('button', { name: 'Add transaction' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'New transaction' })
  await dialog.getByRole('radio', { name: 'Income' }).click()
  await dialog.getByLabel('Amount').fill('1,250.50')
  await dialog.getByLabel('Currency').selectOption('USD')
  await dialog.getByLabel('Category').fill('Consulting')
  await dialog.getByLabel('Date').fill(`${month}-15`)
  await dialog.getByLabel('Note').fill('Architecture review')
  await dialog.getByRole('button', { name: 'Add transaction' }).click()

  await expect(page.getByText('Transaction added')).toBeVisible()
  const row = page.getByRole('row', { name: /Consulting/ })
  await expect(row).toContainText('+$1,250.50')
  await expect(page.getByRole('definition').filter({ hasText: '$1,250.50' }).first()).toBeVisible()

  await row.getByRole('button', { name: 'Consulting', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit transaction' })
  await edit.getByLabel('Amount').fill('1300')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Transaction updated')).toBeVisible()
  await expect(row).toContainText('+$1,300.00')

  await row.hover()
  await row.getByRole('button', { name: 'Actions for Consulting' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Transaction deleted')).toBeVisible()
  await expect(page.getByText(/^No transactions in /)).toBeVisible()
})

test('validates inline before submitting', async ({ page }) => {
  await page.goto('/transactions?new=1')
  const dialog = page.getByRole('dialog', { name: 'New transaction' })
  await dialog.getByLabel('Amount').fill('12.345')
  await dialog.getByLabel('Amount').blur()
  await expect(dialog.getByText('Enter an amount like 1250 or 1,250.00.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add transaction' }).click()
  await expect(dialog.getByText('Enter a category.')).toBeVisible()
  await expect(dialog).toBeVisible()
})
