import { readFileSync } from 'node:fs'

import { asc, eq, inArray, sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { companies, invoices, recurringRules, transactions, users } from '.'

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

async function createInvoice(
  userId: string,
  overrides: Partial<typeof invoices.$inferInsert> = {},
) {
  const [company] = await db
    .insert(companies)
    .values({ userId, name: 'Studio Rofiq', defaultCurrency: 'USD' })
    .returning()
  const [row] = await db
    .insert(invoices)
    .values({
      userId,
      companyId: company!.id,
      number: 1,
      numberLabel: 'INV-0001',
      issueDate: '2026-10-07',
      dueDate: '2026-10-21',
      currency: 'USD',
      clientName: 'Northwind Labs',
      subtotalMinor: 100_000,
      taxMinor: 0,
      totalMinor: 100_000,
      ...overrides,
    })
    .returning()
  return row!
}

describe('invoice payment entries', () => {
  it('allows one income entry per invoice', async () => {
    const user = await createTestUser()
    const invoice = await createInvoice(user.id)
    const entry = { ...valid, type: 'income' as const, userId: user.id, invoiceId: invoice.id }
    await db.insert(transactions).values(entry)
    await expect(db.insert(transactions).values(entry)).rejects.toThrow()
  })

  it('rejects an expense, or an entry from both a rule and an invoice', async () => {
    const user = await createTestUser()
    const invoice = await createInvoice(user.id)
    await expect(
      db.insert(transactions).values({ ...valid, userId: user.id, invoiceId: invoice.id }),
    ).rejects.toThrow()

    const [rule] = await db
      .insert(recurringRules)
      .values({
        userId: user.id,
        label: 'Retainer',
        type: 'income',
        amountMinor: 1000,
        currency: 'USD',
        category: 'Clients',
        frequency: 'monthly',
        dayOfMonth: 1,
        startsOn: '2026-10-01',
      })
      .returning()
    await expect(
      db.insert(transactions).values({
        ...valid,
        type: 'income',
        userId: user.id,
        invoiceId: invoice.id,
        recurringRuleId: rule!.id,
        occurrenceDate: '2026-10-01',
      }),
    ).rejects.toThrow()
  })

  it('goes with its invoice', async () => {
    const user = await createTestUser()
    const invoice = await createInvoice(user.id)
    await db
      .insert(transactions)
      .values({ ...valid, type: 'income', userId: user.id, invoiceId: invoice.id })
    await db.delete(invoices).where(eq(invoices.id, invoice.id))
    expect(
      await db.select().from(transactions).where(eq(transactions.invoiceId, invoice.id)),
    ).toEqual([])
  })
})

describe('invoice payment backfill (0013)', () => {
  const backfill = readFileSync('drizzle/0013_invoice_payment_backfill.sql', 'utf8')
  class Rollback extends Error {}

  it('records each paid invoice once, on its paid day in the owner’s timezone', async () => {
    const user = await createTestUser({ timezone: 'Asia/Jakarta' })
    const paidState = {
      status: 'paid' as const,
      sentAt: new Date('2026-10-20T03:00:00Z'),
      // 20:00 UTC on the 24th is 03:00 on the 25th in Jakarta.
      paidAt: new Date('2026-10-24T20:00:00Z'),
    }
    const paid = await createInvoice(user.id, { ...paidState, currency: 'IDR' })
    const free = await createInvoice(user.id, {
      ...paidState,
      subtotalMinor: 0,
      totalMinor: 0,
    })
    const draft = await createInvoice(user.id)
    const recorded = await createInvoice(user.id, paidState)
    await db.insert(transactions).values({
      ...valid,
      type: 'income',
      amountMinor: 1,
      userId: user.id,
      invoiceId: recorded.id,
    })
    const ids = [paid.id, free.id, draft.id, recorded.id]

    // Rolled back, so the entries it adds for other test users' invoices
    // never reach the test files running alongside this one.
    let rows: unknown[] = []
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql.raw(backfill))
        await tx.execute(sql.raw(backfill))
        rows = await tx
          .select({
            invoiceId: transactions.invoiceId,
            type: transactions.type,
            amountMinor: transactions.amountMinor,
            currency: transactions.currency,
            category: transactions.category,
            occurredOn: transactions.occurredOn,
          })
          .from(transactions)
          .where(inArray(transactions.invoiceId, ids))
          .orderBy(asc(transactions.amountMinor))
        throw new Rollback()
      }),
    ).rejects.toBeInstanceOf(Rollback)

    expect(rows).toEqual([
      // Already recorded: left alone.
      expect.objectContaining({ invoiceId: recorded.id, amountMinor: 1 }),
      {
        invoiceId: paid.id,
        type: 'income',
        amountMinor: 100_000,
        currency: 'IDR',
        category: 'Invoices',
        occurredOn: '2026-10-25',
      },
    ])
  })
})
