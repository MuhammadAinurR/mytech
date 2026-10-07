import { expect, test } from '@playwright/test'

test('add a company, upload a logo, and delete it', async ({ page }) => {
  const name = `Northwind Studio ${Date.now()}`
  await page.goto('/companies')
  await page.getByRole('button', { name: 'Add company' }).first().click()

  const dialog = page.getByRole('dialog', { name: 'New company' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByLabel('Number prefix').fill('NW-')
  await dialog.getByLabel('Next number').fill('7')
  await expect(dialog.getByText('NW-0007')).toBeVisible()
  await dialog.getByLabel('Billing email').fill('not-an-email')
  await dialog.getByRole('button', { name: 'Add company' }).click()
  await expect(dialog.getByText('Enter a valid email address.')).toBeVisible()
  await dialog.getByLabel('Billing email').fill('billing@northwind.example')
  await dialog.getByRole('button', { name: 'Add company' }).click()
  await expect(page.getByText('Company added')).toBeVisible()

  const row = page.getByRole('row', { name: new RegExp(name) })
  await expect(row).toContainText('NW-0007')
  // The row opens the company's page; it's edited from there.
  await row.getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await page.getByRole('button', { name: 'Edit company' }).click()
  const edit = page.getByRole('dialog', { name: 'Edit company' })
  await edit.locator('input[type="file"]').setInputFiles('e2e/fixtures/logo.png')
  await expect(page.getByText('Logo updated')).toBeVisible()
  await expect(edit.getByRole('img', { name: `${name} logo` })).toBeVisible()
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Companies', exact: true }).first().click()
  await row.hover()
  await row.getByRole('button', { name: `Actions for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete company' }).click()
  await expect(page.getByText('Company deleted')).toBeVisible()
  await expect(row).toBeHidden()
})
