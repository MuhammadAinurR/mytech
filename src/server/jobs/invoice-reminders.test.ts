import { afterAll, describe, expect, it, vi } from 'vitest'

import { type PushMessage } from '@/features/notifications/lib/reminders'

import { closeDb } from '../db'
import { createCompany } from '../queries/companies'
import { createInvoice, setInvoiceStatus } from '../queries/invoices'
import { type Delivery, savePushSubscription } from '../queries/push'
import { createTestUser } from '../testing/factories'
import { sendInvoiceReminders } from './invoice-reminders'

afterAll(closeDb)

// 09:30 in Jakarta (UTC+7), 02:30 in UTC.
const NOW = new Date('2026-10-15T02:30:00Z')

async function userWithInvoices(
  timezone: string,
  invoices: { dueDate: string; status: 'draft' | 'sent' | 'paid'; client?: string }[],
  { device = true } = {},
) {
  const user = await createTestUser({ timezone })
  const company = await createCompany(user.id, {
    name: 'Studio Rofiq',
    address: null,
    taxId: null,
    email: null,
    defaultCurrency: 'USD',
    paymentDetails: null,
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1,
  })
  for (const [index, invoice] of invoices.entries()) {
    const created = await createInvoice(user.id, {
      companyId: company.id,
      issueDate: '2026-10-01',
      dueDate: invoice.dueDate,
      currency: 'USD',
      clientName: invoice.client ?? `Client ${index + 1}`,
      clientAddress: null,
      clientEmail: null,
      clientTaxId: null,
      notes: null,
      taxRateBps: 0,
      discountMinor: 0,
      items: [{ description: 'Work', quantityMilli: 1000, unitPriceMinor: 100_000 }],
    })
    if (!created.ok) throw new Error('setup')
    if (invoice.status !== 'draft') await setInvoiceStatus(user.id, created.data.id, 'sent')
    if (invoice.status === 'paid') await setInvoiceStatus(user.id, created.data.id, 'paid')
  }
  if (device) {
    await savePushSubscription(user.id, {
      endpoint: `https://push.example/send/${crypto.randomUUID()}`,
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
      label: 'iPhone · Safari',
    })
  }
  return user
}

/** A push stand-in that records messages per user and reports the given outcome. */
function fakePush(outcome: Partial<Delivery> = { sent: 1 }) {
  const calls: { userId: string; message: PushMessage }[] = []
  const push = vi.fn(async (userId: string, message: PushMessage) => {
    calls.push({ userId, message })
    return { sent: 0, gone: 0, failed: 0, ...outcome }
  })
  return { push, calls, of: (userId: string) => calls.filter((c) => c.userId === userId) }
}

describe('sendInvoiceReminders', () => {
  it('reminds 3 days before, on the day, and the day after, from 09:00 local time', async () => {
    const user = await userWithInvoices('Asia/Jakarta', [
      { dueDate: '2026-10-18', status: 'sent', client: 'Northwind Labs' },
      { dueDate: '2026-10-15', status: 'sent', client: 'Kopi Sore' },
      { dueDate: '2026-10-15', status: 'sent', client: 'Bluebird' },
      { dueDate: '2026-10-14', status: 'sent', client: 'Lintas Data' },
      { dueDate: '2026-10-16', status: 'sent' },
      { dueDate: '2026-10-15', status: 'draft' },
      { dueDate: '2026-10-15', status: 'paid' },
    ])
    const fake = fakePush()

    await sendInvoiceReminders({ now: NOW, push: fake.push })

    const titles = fake
      .of(user.id)
      .map((c) => c.message.title)
      .sort()
    expect(titles).toEqual([
      '2 invoices are due today',
      'INV-0001 is due in 3 days',
      'INV-0004 is overdue',
    ])
    const summary = fake.of(user.id).find((c) => c.message.title.startsWith('2 invoices'))
    expect(summary?.message).toMatchObject({
      body: 'Kopi Sore, Bluebird',
      url: '/invoices?status=sent',
    })
  })

  it('waits for 09:00 in the user’s own timezone', async () => {
    const user = await userWithInvoices('UTC', [{ dueDate: '2026-10-15', status: 'sent' }])
    const fake = fakePush()
    await sendInvoiceReminders({ now: NOW, push: fake.push })
    expect(fake.of(user.id)).toEqual([])

    await sendInvoiceReminders({ now: new Date('2026-10-15T09:00:00Z'), push: fake.push })
    expect(fake.of(user.id).map((c) => c.message.title)).toEqual(['INV-0001 is due today'])
  })

  it('sends each reminder once, however often it runs', async () => {
    const user = await userWithInvoices('Asia/Jakarta', [{ dueDate: '2026-10-15', status: 'sent' }])
    const fake = fakePush()
    await sendInvoiceReminders({ now: NOW, push: fake.push })
    await sendInvoiceReminders({ now: new Date('2026-10-15T08:00:00Z'), push: fake.push })
    await Promise.all([
      sendInvoiceReminders({ now: NOW, push: fake.push }),
      sendInvoiceReminders({ now: NOW, push: fake.push }),
    ])
    expect(fake.of(user.id)).toHaveLength(1)
  })

  it('tries again next run when no device accepted it', async () => {
    const user = await userWithInvoices('Asia/Jakarta', [{ dueDate: '2026-10-15', status: 'sent' }])
    const failing = fakePush({ failed: 1 })
    await sendInvoiceReminders({ now: NOW, push: failing.push })
    expect(failing.of(user.id)).toHaveLength(1)

    const working = fakePush()
    await sendInvoiceReminders({ now: NOW, push: working.push })
    expect(working.of(user.id)).toHaveLength(1)
    await sendInvoiceReminders({ now: NOW, push: working.push })
    expect(working.of(user.id)).toHaveLength(1)
  })

  it('skips users without a device, and only ever messages the owner', async () => {
    const without = await userWithInvoices(
      'Asia/Jakarta',
      [{ dueDate: '2026-10-15', status: 'sent' }],
      { device: false },
    )
    const owner = await userWithInvoices('Asia/Jakarta', [
      { dueDate: '2026-10-15', status: 'sent' },
    ])
    const fake = fakePush()
    await sendInvoiceReminders({ now: NOW, push: fake.push })
    expect(fake.of(without.id)).toEqual([])
    expect(fake.of(owner.id)).toHaveLength(1)
  })
})
