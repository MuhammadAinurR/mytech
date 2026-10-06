import { expect, test } from '@playwright/test'

test('profile changes are validated inline and persist', async ({ page }) => {
  await page.goto('/settings')
  const save = page.getByRole('button', { name: 'Save profile' })
  await expect(save).toBeDisabled()

  const name = page.getByLabel('Name')
  await name.fill('')
  await name.blur()
  await expect(page.getByText('Enter your name.')).toBeVisible()

  await name.fill('Rofiq Example')
  await page.getByLabel('Default currency').selectOption('EUR')
  await save.click()
  await expect(page.getByText('Profile saved')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Default currency')).toHaveValue('EUR')

  // Leave the shared account as other tests expect it.
  await page.getByLabel('Default currency').selectOption('USD')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved')).toBeVisible()
})
