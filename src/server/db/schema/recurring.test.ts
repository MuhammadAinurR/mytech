import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { recurringRules, reminders, transactions } from '.'

afterAll(closeDb)

const rule = {
  label: 'workbench.dev domain',
  type: 'expense' as const,
  amountMinor: 1800,
  currency: 'USD',
  category: 'Domains',
  frequency: 'yearly' as const,
  dayOfMonth: 29,
  monthOfYear: 2,
  startsOn: '2026-01-01',
}

async function insertRule(overrides: Partial<typeof recurringRules.$inferInsert> = {}) {
  const user = await createTestUser()
  const [row] = await db
    .insert(recurringRules)
    .values({ ...rule, ...overrides, userId: overrides.userId ?? user.id })
    .returning()
  return { user, rule: row! }
}

describe('recurring_rules table', () => {
  it('accepts a valid yearly rule and defaults to active', async () => {
    const { rule: row } = await insertRule()
    expect(row).toMatchObject({ isActive: true, monthOfYear: 2, generatedThrough: null })
  })

  it.each([
    ['monthly rules with a month', { frequency: 'monthly' as const, monthOfYear: 3 }],
    ['yearly rules without a month', { monthOfYear: null }],
    ['day 0', { dayOfMonth: 0 }],
    ['day 32', { dayOfMonth: 32 }],
    ['end before start', { endsOn: '2025-12-31' }],
    ['negative reminder lead', { reminderDaysBefore: -1 }],
  ])('rejects %s', async (_label, override) => {
    await expect(insertRule(override)).rejects.toThrow()
  })
})

describe('generated transactions', () => {
  it('allow only one transaction per rule occurrence', async () => {
    const { user, rule: row } = await insertRule()
    const generated = {
      userId: user.id,
      type: 'expense' as const,
      amountMinor: 1800,
      currency: 'USD',
      category: 'Domains',
      occurredOn: '2027-02-28',
      recurringRuleId: row.id,
      occurrenceDate: '2027-02-28',
    }
    await db.insert(transactions).values(generated)
    await expect(db.insert(transactions).values(generated)).rejects.toThrow()

    // ON CONFLICT DO NOTHING is how the worker stays idempotent.
    const again = await db.insert(transactions).values(generated).onConflictDoNothing().returning()
    expect(again).toEqual([])
  })

  it('keep their history when the rule is deleted', async () => {
    const { user, rule: row } = await insertRule()
    const [tx] = await db
      .insert(transactions)
      .values({
        userId: user.id,
        type: 'expense',
        amountMinor: 1800,
        currency: 'USD',
        category: 'Domains',
        occurredOn: '2026-02-28',
        recurringRuleId: row.id,
        occurrenceDate: '2026-02-28',
      })
      .returning()
    await db.insert(reminders).values({
      userId: user.id,
      ruleId: row.id,
      occurrenceDate: '2027-02-28',
      remindOn: '2027-02-14',
    })

    await db.delete(recurringRules).where(eq(recurringRules.id, row.id))
    const [kept] = await db.select().from(transactions).where(eq(transactions.id, tx!.id))
    expect(kept).toMatchObject({ recurringRuleId: null, occurrenceDate: '2026-02-28' })
    expect(await db.select().from(reminders).where(eq(reminders.ruleId, row.id))).toEqual([])
  })

  it('reject a reminder dated after its occurrence', async () => {
    const { user, rule: row } = await insertRule()
    await expect(
      db.insert(reminders).values({
        userId: user.id,
        ruleId: row.id,
        occurrenceDate: '2027-02-28',
        remindOn: '2027-03-01',
      }),
    ).rejects.toThrow()
  })
})
