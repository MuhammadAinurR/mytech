import { expect, test } from '@playwright/test'

const SENTENCE =
  'Please transfer payment to BNI, account number 0123 4567 89, in the name of PT Bank Test.'

test('a company’s bank account appears on its unpaid invoices', async ({ page }) => {
  const stamp = Date.now()
  const companyName = `Bank Co ${stamp}`
  const prefix = `B${String(stamp).slice(-6)}-`

  await page.goto('/companies?new=1')
  const dialog = page.getByRole('dialog', { name: 'New company' })
  await dialog.getByLabel('Name', { exact: true }).fill(companyName)
  await dialog.getByLabel('Number prefix').fill(prefix)

  // All three or none: a bank alone names what's missing.
  await dialog.getByLabel('Bank', { exact: true }).fill('BNI')
  await dialog.getByRole('button', { name: 'Add company' }).click()
  await expect(
    dialog.getByText('Add the account number too, or clear the bank details.'),
  ).toBeVisible()
  await expect(
    dialog.getByText('Add the account holder too, or clear the bank details.'),
  ).toBeVisible()

  await dialog.getByLabel('Account number').fill(' 0123   4567 89 ')
  await dialog.getByLabel('Account holder').fill('PT Bank Test')
  await expect(dialog.getByText(`Invoices will say: ${SENTENCE}`)).toBeVisible()
  await dialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()

  await page.goto('/invoices/new')
  await page.getByLabel('Company').selectOption({ label: companyName })
  await page.getByLabel('Client name').fill('Northwind Labs')
  await page.getByLabel('Line 1 description').fill('Design system')
  await page.getByLabel('Line 1 unit price').fill('1,000')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)

  const document = page.getByRole('article', { name: `Invoice ${prefix}0001` })
  await expect(document).toContainText(SENTENCE)
  await page.getByRole('button', { name: 'Mark as sent' }).click()
  await expect(page.getByText('Marked as sent')).toBeVisible()
  await expect(document).toContainText(SENTENCE)

  // Paid invoices don't ask for payment.
  await page.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(page.getByText('Marked as paid')).toBeVisible()
  await expect(document).toContainText('Total paid')
  await expect(document).not.toContainText('Please transfer payment')
})
