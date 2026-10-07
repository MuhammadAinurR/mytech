import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { companies, invoiceReminderPushes, invoices, pushSubscriptions, users } from '.'

afterAll(closeDb)

const subscription = (
  userId: string,
  overrides: Partial<typeof pushSubscriptions.$inferInsert> = {},
) => ({
  userId,
  endpoint: `https://push.example/send/${crypto.randomUUID()}`,
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
  ...overrides,
})

async function invoiceFor(userId: string) {
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
      issueDate: '2026-10-01',
      dueDate: '2026-10-15',
      currency: 'USD',
      clientName: 'Northwind Labs',
      subtotalMinor: 1000,
      taxMinor: 0,
      totalMinor: 1000,
    })
    .returning()
  return row!
}

describe('push_subscriptions table', () => {
  it('stores a subscription, without a label', async () => {
    const user = await createTestUser()
    const [row] = await db.insert(pushSubscriptions).values(subscription(user.id)).returning()
    expect(row).toMatchObject({ label: null, lastSuccessAt: null })
  })

  it('keeps each endpoint once', async () => {
    const user = await createTestUser()
    const other = await createTestUser()
    const first = subscription(user.id)
    await db.insert(pushSubscriptions).values(first)
    await expect(
      db.insert(pushSubscriptions).values({ ...first, userId: other.id }),
    ).rejects.toThrow()
  })

  it.each([
    ['a non-https endpoint', { endpoint: 'http://push.example/x' }],
    ['an endpoint over 2048 characters', { endpoint: `https://p.example/${'x'.repeat(2048)}` }],
    ['an empty key', { p256dh: '' }],
    ['an auth secret over 256 characters', { auth: 'x'.repeat(257) }],
    ['a label over 120 characters', { label: 'x'.repeat(121) }],
  ])('rejects %s', async (_label, override) => {
    const user = await createTestUser()
    await expect(
      db.insert(pushSubscriptions).values(subscription(user.id, override)),
    ).rejects.toThrow()
  })

  it('goes with its user', async () => {
    const user = await createTestUser()
    await db.insert(pushSubscriptions).values(subscription(user.id))
    await db.delete(users).where(eq(users.id, user.id))
    expect(
      await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)),
    ).toEqual([])
  })
})

describe('invoice_reminder_pushes table', () => {
  it('records each reminder once per invoice, kind, and due date', async () => {
    const user = await createTestUser()
    const invoice = await invoiceFor(user.id)
    const reminder = { userId: user.id, invoiceId: invoice.id, kind: 'due' as const }

    await db.insert(invoiceReminderPushes).values({ ...reminder, dueDate: '2026-10-15' })
    await expect(
      db.insert(invoiceReminderPushes).values({ ...reminder, dueDate: '2026-10-15' }),
    ).rejects.toThrow()
    // A moved due date earns its own reminders; so does another kind.
    await db.insert(invoiceReminderPushes).values({ ...reminder, dueDate: '2026-10-20' })
    await db
      .insert(invoiceReminderPushes)
      .values({ ...reminder, kind: 'upcoming', dueDate: '2026-10-15' })

    await db.delete(invoices).where(eq(invoices.id, invoice.id))
    expect(
      await db
        .select()
        .from(invoiceReminderPushes)
        .where(eq(invoiceReminderPushes.invoiceId, invoice.id)),
    ).toEqual([])
  })
})
