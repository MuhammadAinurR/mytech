import { expect, test } from '@playwright/test'

test('store, reveal, copy, edit, and delete a credential', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const label = `Staging DB ${Date.now()}`
  const secret = `s3cret-${Math.random().toString(36).slice(2)}`

  await page.goto('/credentials')
  await page.getByRole('button', { name: 'Add credential' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'New credential' })
  await dialog.getByLabel('Name', { exact: true }).fill(label)
  await dialog.getByLabel('Host or URL').fill('staging-db.internal.example')
  await dialog.getByLabel('Username').fill('app')
  await dialog.getByLabel('Secret', { exact: true }).fill(secret)
  await dialog.getByRole('button', { name: 'Save credential' }).click()
  await expect(page.getByText('Credential saved')).toBeVisible()

  // The secret is not in the page until it is explicitly revealed.
  const html = await (await request.get('/credentials')).text()
  expect(html).not.toContain(secret)
  await expect(page.getByText(secret)).toHaveCount(0)

  const row = page.getByRole('row', { name: new RegExp(label) })
  await row.getByRole('button', { name: `Reveal secret for ${label}` }).click()
  await expect(row.getByText(secret)).toBeVisible()
  await expect(row).toContainText('just now')
  await row.getByRole('button', { name: `Hide secret for ${label}` }).click()
  await expect(row.getByText(secret)).toHaveCount(0)

  await row.getByRole('button', { name: `Copy secret for ${label}` }).click()
  await expect(page.getByText('Secret copied')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(secret)

  // Editing without a new secret keeps the stored one.
  await row.getByRole('button', { name: label, exact: true }).click()
  const edit = page.getByRole('dialog', { name: 'Edit credential' })
  await edit.getByLabel('Username').fill('app_rw')
  await edit.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Credential updated')).toBeVisible()
  await row.getByRole('button', { name: `Reveal secret for ${label}` }).click()
  await expect(row.getByText(secret)).toBeVisible()

  await row.hover()
  await row.getByRole('button', { name: `Actions for ${label}` }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete credential' }).click()
  await expect(page.getByText('Credential deleted')).toBeVisible()
  await expect(row).toBeHidden()
})

test('searches by host', async ({ page }) => {
  await page.goto('/credentials?q=no-such-host-anywhere')
  await expect(page.getByText('No credentials match “no-such-host-anywhere”.')).toBeVisible()
})
