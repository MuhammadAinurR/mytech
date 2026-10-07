import { expect, test, type Page } from '@playwright/test'

async function addTransaction(page: Page, category: string) {
  await page.goto('/transactions?new=1')
  const dialog = page.getByRole('dialog', { name: 'New transaction' })
  await dialog.getByLabel('Amount').fill('10')
  await dialog.getByLabel('Category').fill(category)
  await dialog.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByText('Transaction added')).toBeVisible()
}

/** Records whether a route loading skeleton is ever rendered from now on. */
async function watchForSkeleton(page: Page) {
  await page.evaluate(() => {
    const seen = () => document.querySelector('[aria-busy="true"][aria-label^="Loading"]') !== null
    const state = window as unknown as { sawSkeleton: boolean }
    state.sawSkeleton = seen()
    new MutationObserver(() => {
      if (seen()) state.sawSkeleton = true
    }).observe(document.body, { childList: true, subtree: true })
  })
  return () => page.evaluate(() => (window as unknown as { sawSkeleton: boolean }).sawSkeleton)
}

test('revisiting a page shows the previous data at once and refreshes it in the background', async ({
  page,
  context,
}) => {
  const stamp = Date.now()
  const before = `SWR before ${stamp}`
  const after = `SWR after ${stamp}`
  const nav = page.getByRole('navigation', { name: 'Main' })

  await addTransaction(page, before)
  await nav.getByRole('link', { name: 'Companies' }).click()
  await expect(page.getByRole('heading', { name: 'Companies' })).toBeVisible()

  // Something changes elsewhere (another tab) while this one is on Companies.
  const other = await context.newPage()
  await addTransaction(other, after)
  await other.close()

  // Revisits within 2s count as fresh; wait past that so the revisit refreshes.
  await page.waitForTimeout(2_100)
  const sawSkeleton = await watchForSkeleton(page)
  await nav.getByRole('link', { name: 'Transactions' }).click()

  // Instantly: the cached page, still without the other tab's entry.
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  await expect(page.getByRole('button', { name: before, exact: true })).toBeVisible()
  // Then the background refresh brings it in, without a reload.
  await expect(page.getByRole('button', { name: after, exact: true })).toBeVisible()
  expect(await sawSkeleton()).toBe(false)
})
