import { expect, test, type Page } from '@playwright/test'

async function createCompany(page: Page, name: string) {
  await page.goto('/companies?new=1')
  const dialog = page.getByRole('dialog', { name: 'New company' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()
  await page
    .getByRole('row', { name: new RegExp(name) })
    .getByRole('link', { name })
    .click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

test('save clients on a company and start an invoice from one', async ({ page }) => {
  const company = `Client test ${Date.now()}`
  await createCompany(page, company)
  await expect(page.getByText('No saved clients yet')).toBeVisible()

  await page.getByRole('button', { name: 'Add client' }).click()
  const dialog = page.getByRole('dialog', { name: 'New client' })
  await dialog.getByLabel('Name').fill('Northwind Labs')
  await dialog.getByLabel('Address').fill('Jl. Thamrin 10\nJakarta 10230')
  await dialog.getByLabel('Email').fill('not-an-email')
  await dialog.getByRole('button', { name: 'Add client' }).click()
  await expect(dialog.getByText('Enter a valid email address.')).toBeVisible()
  await dialog.getByLabel('Email').fill('ap@northwind.example')
  await dialog.getByLabel('Tax ID').fill('01.234.567.8-901.000')
  await dialog.getByRole('button', { name: 'Add client' }).click()
  await expect(page.getByText('Client added')).toBeVisible()

  const row = page.getByRole('row', { name: /Northwind Labs/ })
  await expect(row).toContainText('ap@northwind.example')
  await expect(row).toContainText('Jl. Thamrin 10')

  // One name per company, whatever the case.
  await page.getByRole('button', { name: 'Add client' }).click()
  const again = page.getByRole('dialog', { name: 'New client' })
  await again.getByLabel('Name').fill('northwind labs')
  await again.getByRole('button', { name: 'Add client' }).click()
  await expect(again.getByText('This company already has a client with this name.')).toBeVisible()
  await page.keyboard.press('Escape')

  // Edit from the row.
  await row.getByRole('button', { name: 'Northwind Labs', exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit client' })
  await expect(edit.getByLabel('Email')).toHaveValue('ap@northwind.example')
  await edit.getByLabel('Email').fill('finance@northwind.example')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Client updated')).toBeVisible()
  await expect(row).toContainText('finance@northwind.example')

  // Start an invoice for them: the editor arrives filled in.
  await row.hover()
  await row.getByRole('button', { name: 'Actions for Northwind Labs' }).click()
  await page.getByRole('menuitem', { name: 'New invoice' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'New invoice' })).toBeVisible()
  await expect(page.getByLabel('Company').locator('option:checked')).toHaveText(company)
  await expect(page.getByLabel('Client name')).toHaveValue('Northwind Labs')
  await expect(page.getByLabel('Address')).toHaveValue('Jl. Thamrin 10\nJakarta 10230')
  await expect(page.getByLabel('Email')).toHaveValue('finance@northwind.example')
  await expect(page.getByLabel('Tax ID')).toHaveValue('01.234.567.8-901.000')

  // Delete the client; the company counts it down to none.
  await page.goBack()
  await row.hover()
  await row.getByRole('button', { name: 'Actions for Northwind Labs' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete client' }).click()
  await expect(page.getByText('Client deleted')).toBeVisible()
  await expect(page.getByText('No saved clients yet')).toBeVisible()
})

test('pick a saved client on an invoice, or save a new one from it', async ({ page }) => {
  const company = `Picker test ${Date.now()}`
  await createCompany(page, company)
  await page.getByRole('button', { name: 'Add client' }).click()
  const dialog = page.getByRole('dialog', { name: 'New client' })
  await dialog.getByLabel('Name').fill('Northwind Labs')
  await dialog.getByLabel('Address').fill('Jl. Thamrin 10')
  await dialog.getByLabel('Email').fill('ap@northwind.example')
  await dialog.getByRole('button', { name: 'Add client' }).click()
  await expect(page.getByText('Client added')).toBeVisible()

  await page.goto('/invoices/new')
  await expect(page.getByLabel('Saved client')).toBeHidden()
  await page.getByLabel('Company').selectOption({ label: company })

  // Picking fills "Bill to"; "New client" clears it again.
  const picker = page.getByLabel('Saved client')
  await picker.selectOption({ label: 'Northwind Labs' })
  await expect(page.getByLabel('Client name')).toHaveValue('Northwind Labs')
  await expect(page.getByLabel('Address')).toHaveValue('Jl. Thamrin 10')
  await expect(page.getByLabel('Email')).toHaveValue('ap@northwind.example')
  const save = page.getByRole('checkbox', { name: `Save to ${company}’s clients` })
  await expect(save).toBeHidden()
  await picker.selectOption({ label: 'New client' })
  await expect(page.getByLabel('Client name')).toHaveValue('')
  await expect(page.getByLabel('Email')).toHaveValue('')

  // A new client, saved from the invoice.
  await page.getByLabel('Client name').fill('Bluebird Coffee')
  await page.getByLabel('Address').fill('Jl. Kemang Raya 8')
  await expect(picker).toHaveValue('')
  await save.check()
  await page.getByLabel('Line 1 description').fill('Brand refresh')
  await page.getByLabel('Line 1 unit price').fill('2,400')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText(`Bluebird Coffee is saved to ${company}’s clients.`)).toBeVisible()
  await expect(page).toHaveURL(/\/invoices\/[0-9a-f-]{36}$/)

  // It's on the company now, and the next invoice offers it.
  await page.goto('/companies')
  await page
    .getByRole('row', { name: new RegExp(company) })
    .getByRole('link', { name: company })
    .click()
  await expect(page.getByRole('row', { name: /Bluebird Coffee/ })).toContainText(
    'Jl. Kemang Raya 8',
  )
  await page.getByRole('link', { name: 'New invoice' }).click()
  await page.getByLabel('Saved client').selectOption({ label: 'Bluebird Coffee' })
  await expect(page.getByLabel('Address')).toHaveValue('Jl. Kemang Raya 8')
})
