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
  await row.getByRole('button', { name, exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit company' })
  await edit.locator('input[type="file"]').setInputFiles('e2e/fixtures/logo.png')
  await expect(page.getByText('Logo updated')).toBeVisible()
  await expect(edit.getByRole('img', { name: `${name} logo` })).toBeVisible()
  await page.keyboard.press('Escape')

  await row.hover()
  await row.getByRole('button', { name: `Actions for ${name}` }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete company' }).click()
  await expect(page.getByText('Company deleted')).toBeVisible()
  await expect(row).toBeHidden()
})
