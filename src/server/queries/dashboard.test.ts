import { afterAll, describe, expect, it } from 'vitest'

import { type CurrencyCode } from '@/lib/money'

import { closeDb } from '../db'
import { createTestUser } from '../testing/factories'
import { createCompany } from './companies'
import { createInvoice, listDueInvoices, setInvoiceStatus } from './invoices'
import { createTransaction, getMonthlySeries } from './transactions'

afterAll(closeDb)

describe('getMonthlySeries', () => {
  it('sums one currency per month and fills empty months', async () => {
    const user = await createTestUser()
    const add = (
      occurredOn: string,
      type: 'income' | 'expense',
      amountMinor: number,
      currency: CurrencyCode = 'USD',
    ) =>
      createTransaction(user.id, {
        occurredOn,
        type,
        amountMinor,
        currency,
        category: 'Test',
        note: null,
      })
    await add('2026-08-03', 'income', 100_000)
    await add('2026-08-20', 'expense', 30_000)
    await add('2026-10-01', 'expense', 5_000)
    await add('2026-10-02', 'income', 999_999, 'IDR')
    await add('2026-07-31', 'income', 1) // outside the range

    expect(await getMonthlySeries(user.id, 'USD', ['2026-08', '2026-09', '2026-10'])).toEqual([
      { month: '2026-08', incomeMinor: 100_000, expenseMinor: 30_000, netMinor: 70_000 },
      { month: '2026-09', incomeMinor: 0, expenseMinor: 0, netMinor: 0 },
      { month: '2026-10', incomeMinor: 0, expenseMinor: 5_000, netMinor: -5_000 },
    ])
    const other = await createTestUser()
    expect(
      (await getMonthlySeries(other.id, 'USD', ['2026-08'])).every((p) => p.netMinor === 0),
    ).toBe(true)
  })
})

describe('listDueInvoices', () => {
  it('lists sent invoices by due date and leaves drafts, paid, and other users out', async () => {
    const user = await createTestUser()
    const company = await createCompany(user.id, {
      name: 'Studio',
      address: null,
      taxId: null,
      email: null,
      defaultCurrency: 'USD',
      paymentDetails: null,
      invoicePrefix: 'D-',
      nextInvoiceNumber: 1,
    })
    const make = async (dueDate: string, status: 'draft' | 'sent' | 'paid') => {
      const created = await createInvoice(user.id, {
        companyId: company.id,
        issueDate: '2026-10-01',
        dueDate,
        currency: 'USD',
        clientName: `Due ${dueDate}`,
        clientAddress: null,
        clientEmail: null,
        clientTaxId: null,
        notes: null,
        taxRateBps: 0,
        discountMinor: 0,
        items: [{ description: 'Work', quantityMilli: 1000, unitPriceMinor: 1000 }],
      })
      if (!created.ok) throw new Error('setup')
      if (status !== 'draft')
        await setInvoiceStatus(user.id, created.data.id, status === 'paid' ? 'paid' : 'sent')
    }
    await make('2026-10-30', 'sent')
    await make('2026-10-05', 'sent')
    await make('2026-10-10', 'draft')
    await make('2026-10-01', 'paid')

    expect((await listDueInvoices(user.id)).map((i) => i.clientName)).toEqual([
      'Due 2026-10-05',
      'Due 2026-10-30',
    ])
    expect(await listDueInvoices((await createTestUser()).id)).toEqual([])
  })
})
