import { expect, test } from '@playwright/test'

test('a paid invoice is income in transactions, opens from there, and leaves when unpaid', async ({
  page,
}) => {
  const stamp = Date.now()
  const companyName = `Paid Co ${stamp}`
  const prefix = `P${String(stamp).slice(-6)}-`
  const number = `${prefix}0001`

  await page.goto('/companies?new=1')
  const dialog = page.getByRole('dialog', { name: 'New company' })
  await dialog.getByLabel('Name', { exact: true }).fill(companyName)
  await dialog.getByLabel('Number prefix').fill(prefix)
  await dialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()

  await page.goto('/invoices/new')
  await page.getByLabel('Company').selectOption({ label: companyName })
  await page.getByLabel('Client name').fill('Payment Client')
  await page.getByLabel('Line 1 description').fill('Design system')
  await page.getByLabel('Line 1 unit price').fill('1,000')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  const invoiceUrl = page.url()
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(page.getByText('Marked as sent')).toBeVisible()
  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(page.getByText('Marked as paid')).toBeVisible()

  await page.goto(`/transactions?q=${number}`)
  const row = page.getByRole('row', { name: new RegExp(number) })
  await expect(row).toContainText('Invoices')
  await expect(row).toContainText(`Payment for ${number}`)
  await expect(row).toContainText('$1,000.00')
  // It follows its invoice: the only action is to open it.
  await row.hover()
  await row.getByRole('button', { name: 'Actions for Invoices' }).click()
  await expect(page.getByRole('menuitem')).toHaveText(['Open invoice'])
  await page.getByRole('menuitem', { name: 'Open invoice' }).click()
  await expect(page).toHaveURL(invoiceUrl)

  // The dashboard counts it as money in.
  await page.goto('/dashboard')
  const recent = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Recent transactions' }) })
  await expect(recent.getByRole('listitem').filter({ hasText: number })).toContainText('$1,000.00')
  await page.goto(invoiceUrl)

  await page.getByRole('button', { name: 'More invoice actions' }).click()
  await page.getByRole('menuitem', { name: 'Mark as unpaid' }).click()
  await expect(page.getByText('Marked as sent')).toBeVisible()
  await page.goto(`/transactions?q=${number}`)
  await expect(page.getByText(`Payment for ${number}`)).toHaveCount(0)
  await expect(page.getByText('Nothing matches these filters')).toBeVisible()
})
