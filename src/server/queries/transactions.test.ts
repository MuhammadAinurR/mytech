import { afterAll, describe, expect, it } from 'vitest'

import { type TransactionInput } from '@/features/transactions/schema'

import { closeDb } from '../db'
import { createTestUser } from '../testing/factories'
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  getTransaction,
  listCategories,
  listTransactions,
  updateTransaction,
} from './transactions'

afterAll(closeDb)

const entry = (overrides: Partial<TransactionInput> = {}): TransactionInput => ({
  type: 'expense',
  amountMinor: 1000,
  currency: 'USD',
  category: 'Hosting',
  occurredOn: '2026-10-04',
  note: null,
  ...overrides,
})

describe('transactions data access', () => {
  it('lists newest first with month, type, and search filters', async () => {
    const user = await createTestUser()
    await createTransaction(user.id, entry({ occurredOn: '2026-09-30', category: 'Rent' }))
    await createTransaction(user.id, entry({ occurredOn: '2026-10-01', note: 'VPS for client' }))
    await createTransaction(
      user.id,
      entry({ occurredOn: '2026-10-31', type: 'income', category: 'Retainer' }),
    )

    const october = await listTransactions(user.id, { month: '2026-10' })
    expect(october.items.map((t) => t.occurredOn)).toEqual(['2026-10-31', '2026-10-01'])
    expect(october.total).toBe(2)

    const income = await listTransactions(user.id, { type: 'income' })
    expect(income.items.map((t) => t.category)).toEqual(['Retainer'])

    const search = await listTransactions(user.id, { q: 'vps' })
    expect(search.items).toHaveLength(1)
    const literal = await listTransactions(user.id, { q: '%' })
    expect(literal.total).toBe(0)
  })

  it('paginates with a stable total', async () => {
    const user = await createTestUser()
    for (let day = 1; day <= 7; day++) {
      await createTransaction(user.id, entry({ occurredOn: `2026-10-0${day}` }))
    }
    const page2 = await listTransactions(user.id, { page: 2, pageSize: 3 })
    expect(page2.total).toBe(7)
    expect(page2.items.map((t) => t.occurredOn)).toEqual(['2026-10-04', '2026-10-03', '2026-10-02'])
  })

  it('summarizes a month per currency', async () => {
    const user = await createTestUser()
    await createTransaction(user.id, entry({ type: 'income', amountMinor: 420000 }))
    await createTransaction(user.id, entry({ amountMinor: 1249 }))
    await createTransaction(user.id, entry({ amountMinor: 1800 }))
    await createTransaction(user.id, entry({ currency: 'IDR', amountMinor: 150000 }))
    await createTransaction(user.id, entry({ occurredOn: '2026-11-01', amountMinor: 99999 }))

    expect(await getMonthlySummary(user.id, '2026-10')).toEqual([
      { currency: 'IDR', incomeMinor: 0, expenseMinor: 150000, netMinor: -150000, count: 1 },
      { currency: 'USD', incomeMinor: 420000, expenseMinor: 3049, netMinor: 416951, count: 3 },
    ])
    expect(await getMonthlySummary(user.id, '2025-01')).toEqual([])
  })

  it('suggests categories by frequency', async () => {
    const user = await createTestUser()
    await createTransaction(user.id, entry({ category: 'Software' }))
    await createTransaction(user.id, entry({ category: 'Hosting' }))
    await createTransaction(user.id, entry({ category: 'Hosting' }))
    expect(await listCategories(user.id)).toEqual(['Hosting', 'Software'])
  })
})

describe('transactions isolation', () => {
  it('never lets one user read, change, or delete another user’s transactions', async () => {
    const owner = await createTestUser()
    const intruder = await createTestUser()
    const mine = await createTransaction(owner.id, entry({ note: 'private' }))

    expect(await getTransaction(intruder.id, mine.id)).toBeNull()
    expect((await listTransactions(intruder.id, {})).items).toEqual([])
    expect(await getMonthlySummary(intruder.id, '2026-10')).toEqual([])
    expect(await listCategories(intruder.id)).toEqual([])

    expect(await updateTransaction(intruder.id, mine.id, entry({ amountMinor: 1 }))).toBeNull()
    expect(await deleteTransaction(intruder.id, mine.id)).toBe(false)
    expect(await getTransaction(owner.id, mine.id)).toMatchObject({
      amountMinor: 1000,
      note: 'private',
    })
  })
})
