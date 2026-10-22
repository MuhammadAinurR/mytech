import { expect, test } from '@playwright/test'

import { signUp } from './helpers'

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
  const invoiceUrl = page.url()

  // A sent invoice can still be corrected, and stays sent.
  await page.getByRole('button', { name: 'More invoice actions' }).click()
  await page.getByRole('menuitem', { name: 'Edit' }).click()
  await expect(page).toHaveURL(`${invoiceUrl}/edit`)
  await expect(page.getByText('Sent to Northwind Labs. Saving updates it everywhere')).toBeVisible()
  await page.getByLabel('Line 2 unit price').fill('100')
  // 1,000 + 2.5 × 100 = 1,250; less 100; plus 10% tax = 1,265.
  await expect(totals).toContainText('$1,265.00')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Invoice updated')).toBeVisible()
  await expect(page).toHaveURL(invoiceUrl)
  await expect(document).toContainText('$1,265.00')
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toBeVisible()
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
  // Paid invoices can be corrected too.
  await page.getByRole('button', { name: 'More invoice actions' }).click()
  await expect(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Mark as unpaid' })).toBeVisible()
  await page.keyboard.press('Escape')

  // The next invoice from the same company continues the sequence.
  await page.goto('/invoices/new')
  await page.getByLabel('Company').selectOption({ label: companyName })
  await expect(page.getByText(`This will be ${prefix}0002.`)).toBeVisible()
})

test('editing a sent invoice updates the dashboard’s unpaid total', async ({ browser }) => {
  // A fresh account, so the dashboard holds only this invoice.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await signUp(page)

  await page.goto('/companies?new=1')
  const companyDialog = page.getByRole('dialog', { name: 'New company' })
  await companyDialog.getByLabel('Name').fill('Edit Co')
  await companyDialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()

  await page.goto('/invoices/new')
  await page.getByLabel('Currency').selectOption('USD')
  await page.getByLabel('Client name').fill('Kopi Sore')
  await page.getByLabel('Line 1 description').fill('Branding')
  await page.getByLabel('Line 1 unit price').fill('1,000')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(page.getByText('Marked as sent')).toBeVisible()
  const invoiceUrl = page.url()

  const outstanding = page.locator('dl > div').filter({ hasText: 'Outstanding · USD' })
  await page.goto('/dashboard')
  await expect(outstanding).toContainText('$1,000.00')

  await page.goto(`${invoiceUrl}/edit`)
  await page.getByLabel('Line 1 quantity').fill('3')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Invoice updated')).toBeVisible()

  // Back to the dashboard the way a user would, through the sidebar.
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Dashboard', exact: true })
    .click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(outstanding).toContainText('$3,000.00')
  await context.close()
})

test('the editor shows its values before the app loads, and takes input only after', async ({
  page: setup,
  browser,
}) => {
  await setup.goto('/companies?new=1')
  const companyDialog = setup.getByRole('dialog', { name: 'New company' })
  await companyDialog.getByLabel('Name').fill(`Hydration Co ${Date.now()}`)
  await companyDialog.getByRole('button', { name: 'Add company' }).click()
  await expect(setup.getByText('Company added')).toBeVisible()

  // Without JavaScript the page stays as the server HTML that shows before hydration.
  // Typing into it would be overwritten or merged once the form takes over.
  const context = await browser.newContext({
    javaScriptEnabled: false,
    storageState: 'playwright/.auth/user.json',
  })
  const page = await context.newPage()
  await page.goto('/invoices/new')
  const quantity = page.getByLabel('Line 1 quantity')
  await expect(quantity).toHaveValue('1')
  await expect(quantity).toBeDisabled()
  await context.close()
})

test('the editor validates lines inline', async ({ page }) => {
  await page.goto('/invoices/new')
  await page.getByLabel('Line 1 unit price').fill('12.345')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText('Enter who this invoice is for.')).toBeVisible()
  await expect(page.getByText('Describe this line.')).toBeVisible()
  await expect(page.getByText('Enter a price like 1250 or 1,250.00.')).toBeVisible()
})
