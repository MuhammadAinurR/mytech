import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'a long and careful passphrase'

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`
}

/** Creates a fresh account through the UI and lands on the dashboard. */
export async function signUp(page: Page, name = 'Rofiq Example') {
  const email = uniqueEmail()
  await page.goto('/signup')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  return { email, password: PASSWORD }
}
