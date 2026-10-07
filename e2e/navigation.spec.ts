import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import pg from 'pg'

const databaseUrl =
  process.env.DATABASE_URL ?? parseEnv(readFileSync('.env.test', 'utf8')).DATABASE_URL

async function addTransaction(page: Page, category: string) {
  await page.goto('/transactions?new=1')
  const dialog = page.getByRole('dialog', { name: 'New transaction' })
  await dialog.getByLabel('Amount').fill('10')
  await dialog.getByLabel('Category').fill(category)
  await dialog.getByRole('button', { name: 'Add transaction' }).click()
  await expect(page.getByText('Transaction added')).toBeVisible()
}

/** Adds a transaction from another tab, as if the data changed elsewhere. */
async function addElsewhere(context: BrowserContext, category: string) {
  const other = await context.newPage()
  await addTransaction(other, category)
  await other.close()
}

/**
 * Makes reads of the transactions table wait until the returned function is
 * called, so the Transactions page body streams in well after its shell.
 */
async function holdTransactionsTable() {
  if (!databaseUrl || !new URL(databaseUrl).pathname.startsWith('/workbench_')) {
    throw new Error('Only ever lock a workbench_* database')
  }
  const client = new pg.Client({ connectionString: databaseUrl })
  await client.connect()
  await client.query('BEGIN')
  await client.query('LOCK TABLE transactions IN ACCESS EXCLUSIVE MODE')
  return async () => {
    await client.query('COMMIT')
    await client.end()
  }
}

type Watch = { sawSkeleton: boolean; sawStale: boolean }

/**
 * From now on, records whether a loading skeleton ever renders, and whether
 * the Transactions page was ever on screen with `stale` but without `fresh`.
 */
async function watch(page: Page, stale = '', fresh = '') {
  await page.evaluate(
    ({ stale, fresh }) => {
      const state: Watch = { sawSkeleton: false, sawStale: false }
      ;(window as unknown as { watch: Watch }).watch = state
      new MutationObserver(() => {
        if (document.querySelector('[aria-busy="true"][aria-label^="Loading"]')) {
          state.sawSkeleton = true
        }
        const main = document.getElementById('main')?.textContent ?? ''
        const onTransactions = document.querySelector('main h1')?.textContent === 'Transactions'
        if (stale && onTransactions && main.includes(stale) && !main.includes(fresh)) {
          state.sawStale = true
        }
      }).observe(document.body, { childList: true, subtree: true, characterData: true })
    },
    { stale, fresh },
  )
  return () => page.evaluate(() => (window as unknown as { watch: Watch }).watch)
}

function sidebar(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Main' })
  return async (name: string) => {
    await nav.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  }
}

test('switching between pages repeatedly never shows a skeleton', async ({ page }) => {
  const visit = sidebar(page)
  await page.goto('/transactions')
  // First visits may show a skeleton; everything after must not.
  await visit('Companies')
  await visit('Invoices')
  const seen = await watch(page)
  for (let round = 0; round < 3; round++) {
    await visit('Transactions')
    await visit('Companies')
    await visit('Invoices')
  }
  expect((await seen()).sawSkeleton).toBe(false)
})

test('a revisit shows the cached page while fresh data loads, then updates', async ({
  page,
  context,
}) => {
  const stamp = Date.now()
  const before = `SWR before ${stamp}`
  const after = `SWR after ${stamp}`

  await addTransaction(page, before)
  await sidebar(page)('Companies')
  await addElsewhere(context, after)

  const seen = await watch(page, before, after)
  const release = await holdTransactionsTable()
  try {
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Transactions' })
      .click()
    // The data is held up, yet the page is there: the cached render.
    await expect(page.getByRole('button', { name: before, exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: after, exact: true })).toHaveCount(0)
  } finally {
    await release()
  }
  // Then the fresh render replaces it in place.
  await expect(page.getByRole('button', { name: after, exact: true })).toBeVisible()
  expect(await seen()).toEqual({ sawSkeleton: false, sawStale: true })
})

test('going back shows the cached page and refreshes it', async ({ page, context }) => {
  const stamp = Date.now()
  const before = `Back before ${stamp}`
  const after = `Back after ${stamp}`

  await addTransaction(page, before)
  await sidebar(page)('Companies')
  await addElsewhere(context, after)

  const seen = await watch(page, before, after)
  await page.goBack()
  // Next replays its copy of the page; the refresh brings the other tab's entry.
  await expect(page.getByRole('button', { name: after, exact: true })).toBeVisible()
  expect(await seen()).toEqual({ sawSkeleton: false, sawStale: true })
})

test('filters and month changes keep the current results until new ones arrive', async ({
  page,
}) => {
  await page.goto('/transactions')
  await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible()
  const seen = await watch(page)

  await page
    .getByRole('navigation', { name: 'Filter by type' })
    .getByRole('link', { name: 'Income' })
    .click()
  await expect(page).toHaveURL(/type=income/)
  await expect(page.getByRole('link', { name: 'Income' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('link', { name: 'Previous month' }).click()
  await expect(page.getByRole('link', { name: 'This month' })).toBeVisible()
  expect((await seen()).sawSkeleton).toBe(false)
})

test('an invoice that does not exist shows the not-found page', async ({ page }) => {
  await page.goto('/invoices/00000000-0000-4000-8000-000000000000')
  await expect(page.getByText('This page doesn’t exist')).toBeVisible()
})
