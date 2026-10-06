import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { transactions, users } from '.'

afterAll(closeDb)

const valid = {
  type: 'expense' as const,
  amountMinor: 1249,
  currency: 'USD',
  category: 'Hosting',
  occurredOn: '2026-10-04',
}

describe('transactions table', () => {
  it('stores pure dates as YYYY-MM-DD strings and amounts as integers', async () => {
    const user = await createTestUser()
    const [row] = await db
      .insert(transactions)
      .values({ ...valid, userId: user.id })
      .returning()
    expect(row).toMatchObject({ occurredOn: '2026-10-04', amountMinor: 1249, note: null })
  })

  it.each([
    ['non-positive amounts', { amountMinor: 0 }],
    ['malformed currency', { currency: 'us$' }],
    ['blank category', { category: '   ' }],
    ['overlong notes', { note: 'x'.repeat(1001) }],
  ])('rejects %s', async (_label, override) => {
    const user = await createTestUser()
    await expect(
      db.insert(transactions).values({ ...valid, ...override, userId: user.id }),
    ).rejects.toThrow()
  })

  it('cascades when the owning user is deleted', async () => {
    const user = await createTestUser()
    await db.insert(transactions).values({ ...valid, userId: user.id })
    await db.delete(users).where(eq(users.id, user.id))
    const remaining = await db.select().from(transactions).where(eq(transactions.userId, user.id))
    expect(remaining).toEqual([])
  })
})
