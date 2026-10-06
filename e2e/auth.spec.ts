import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { PASSWORD, signUp } from './helpers'

// These tests exercise sign-up and sign-in themselves, so they start signed out.
test.use({ storageState: { cookies: [], origins: [] } })

test('sign up, sign out, and sign back in', async ({ page }) => {
  const { email } = await signUp(page)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await page.getByRole('button', { name: /Rofiq Example/ }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login$/)

  // The old session is gone: protected pages bounce back to login.
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/)

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('shows inline validation and a generic error for bad credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Enter your email.')).toBeVisible()
  await expect(page.getByText('Enter your password.')).toBeVisible()

  await page.getByLabel('Email').fill('nobody@example.test')
  await page.getByLabel('Password', { exact: true }).fill('not the password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'That email and password don’t match.' }),
  ).toBeVisible()
})

test('the session cookie is httpOnly and SameSite=Lax', async ({ page, context }) => {
  await signUp(page)
  const cookies = await context.cookies()
  const session = cookies.find((cookie) => cookie.name.endsWith('wb_session'))
  expect(session).toMatchObject({ httpOnly: true, sameSite: 'Lax', path: '/' })
})

test('auth pages have no accessibility violations', async ({ page }) => {
  for (const path of ['/login', '/signup']) {
    await page.goto(path)
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations.map((v) => v.id)).toEqual([])
  }
})
