import { expect, test } from '@playwright/test'

test('create, number, send, print, and pay an invoice', async ({ page }) => {
  const stamp = Date.now()
  const companyName = `Invoice Co ${stamp}`
  const prefix = `T${String(stamp).slice(-6)}-`

  // A company to issue from, with its own numbering.
  await page.goto('/companies?new=1')
  const companyDialog = page.getByRole('dialog', { name: 'New company' })
  await companyDialog.getByLabel('Name').fill(companyName)
  await companyDialog.getByLabel('Number prefix').fill(prefix)
  await companyDialog.getByLabel('Payment details').fill('Bank Example · 000-111-222')
  await companyDialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()

  await page.goto('/invoices/new')
  await page.getByLabel('Company').selectOption({ label: companyName })
  await expect(page.getByText(`This will be ${prefix}0001.`)).toBeVisible()
  await page.getByLabel('Client name').fill('Northwind Labs')
  await page.getByLabel('Line 1 description').fill('Design system')
  await page.getByLabel('Line 1 unit price').fill('1,000')
  await page.getByRole('button', { name: 'Add line' }).click()
  await page.getByLabel('Line 2 description').fill('Support hours')
  await page.getByLabel('Line 2 quantity').fill('2.5')
  await page.getByLabel('Line 2 unit price').fill('80')
  await page.getByLabel('Tax rate').fill('10')
  await page.getByLabel('Discount').fill('100')

  // Live totals use the same integer math as the server.
  const totals = page.locator('dl').filter({ hasText: 'Subtotal' })
  await expect(totals).toContainText('$1,200.00')
  await expect(totals).toContainText('−$100.00')
  await expect(totals).toContainText('$110.00')
  await expect(totals).toContainText('$1,210.00')

  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: `${prefix}0001` })).toBeVisible()
  const document = page.getByRole('article', { name: `Invoice ${prefix}0001` })
  await expect(document).toContainText('Amount due')
  await expect(document).toContainText('$1,210.00')
  await expect(document).toContainText('Bank Example · 000-111-222')

  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(page.getByText('Marked as sent')).toBeVisible()
  // Sent invoices are locked: no edit, only status changes.
  await page.getByRole('button', { name: 'More invoice actions' }).click()
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  const invoiceUrl = page.url()
  await page.goto(`${invoiceUrl}/print`)
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible()
  await expect(page.getByRole('article', { name: `Invoice ${prefix}0001` })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Print' })).toBeHidden()
  await page.emulateMedia({ media: 'screen' })

  await page.goto(invoiceUrl)
  const download = page.waitForEvent('download')
  await page.getByRole('link', { name: 'PDF' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe(`${prefix}0001.pdf`)
  const pdfPath = await file.path()
  const { readFileSync } = await import('node:fs')
  expect(readFileSync(pdfPath).subarray(0, 5).toString()).toBe('%PDF-')

  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(page.getByText('Marked as paid')).toBeVisible()
  await expect(page.getByRole('article', { name: `Invoice ${prefix}0001` })).toContainText(
    'Total paid',
  )

  // The next invoice from the same company continues the sequence.
  await page.goto('/invoices/new')
  await page.getByLabel('Company').selectOption({ label: companyName })
  await expect(page.getByText(`This will be ${prefix}0002.`)).toBeVisible()
})

test('the editor validates lines inline', async ({ page }) => {
  await page.goto('/invoices/new')
  await page.getByLabel('Line 1 unit price').fill('12.345')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText('Enter who this invoice is for.')).toBeVisible()
  await expect(page.getByText('Describe this line.')).toBeVisible()
  await expect(page.getByText('Enter a price like 1250 or 1,250.00.')).toBeVisible()
})
