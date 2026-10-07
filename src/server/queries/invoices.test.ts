import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { type CompanyInput } from '@/features/companies/schema'
import { type InvoiceFields } from '@/features/invoices/schema'

import { closeDb, db } from '../db'
import { invoiceItems } from '../db/schema'
import { createTestUser } from '../testing/factories'
import { listClients } from './clients'
import { createCompany, deleteCompany, getCompany } from './companies'
import {
  createInvoice,
  deleteInvoice,
  getInvoice,
  getReceivables,
  listInvoices,
  setInvoiceStatus,
  updateInvoice,
} from './invoices'

afterAll(closeDb)

const company = (overrides: Partial<CompanyInput> = {}): CompanyInput => ({
  name: 'Studio Rofiq',
  address: 'Jl. Sudirman 1\nJakarta',
  taxId: '01.234.567.8-901.000',
  email: 'billing@studio.example',
  defaultCurrency: 'USD',
  paymentDetails: 'Bank Example · 123-456-789',
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1,
  ...overrides,
})

const invoice = (companyId: string, overrides: Partial<InvoiceFields> = {}): InvoiceFields => ({
  companyId,
  issueDate: '2026-10-07',
  dueDate: '2026-10-21',
  currency: 'USD',
  clientName: 'Northwind Labs',
  clientAddress: null,
  clientEmail: 'ap@northwind.example',
  clientTaxId: null,
  notes: null,
  taxRateBps: 1100,
  discountMinor: 5_000,
  items: [
    { description: 'Design system', quantityMilli: 1000, unitPriceMinor: 100_000 },
    { description: 'Support hours', quantityMilli: 2500, unitPriceMinor: 2_000 },
  ],
  ...overrides,
})

async function setup(overrides: Partial<CompanyInput> = {}) {
  const user = await createTestUser()
  const issuer = await createCompany(user.id, company(overrides))
  return { user, issuer }
}

describe('invoice numbering', () => {
  it('numbers invoices per company with the company prefix', async () => {
    const { user, issuer } = await setup({ invoicePrefix: '2026/', nextInvoiceNumber: 41 })
    const other = await createCompany(user.id, company({ name: 'Side project' }))

    const first = await createInvoice(user.id, invoice(issuer.id))
    const second = await createInvoice(user.id, invoice(issuer.id))
    const elsewhere = await createInvoice(user.id, invoice(other.id))

    expect([first, second, elsewhere].map((r) => r.ok && r.data.numberLabel)).toEqual([
      '2026/0041',
      '2026/0042',
      'INV-0001',
    ])
    expect((await getCompany(user.id, issuer.id))?.nextInvoiceNumber).toBe(43)
  })

  it('never hands out the same number under concurrent creates', async () => {
    const { user, issuer } = await setup()
    const results = await Promise.all(
      Array.from({ length: 10 }, () => createInvoice(user.id, invoice(issuer.id))),
    )
    const labels = results.map((r) => (r.ok ? r.data.numberLabel : r.error)).sort()
    expect(labels).toEqual(
      Array.from({ length: 10 }, (_, i) => `INV-${String(i + 1).padStart(4, '0')}`),
    )
  })

  it('reports a collision if the counter was moved back onto an existing number', async () => {
    const { user, issuer } = await setup()
    await createInvoice(user.id, invoice(issuer.id))
    const { updateCompany } = await import('./companies')
    await updateCompany(user.id, issuer.id, company({ nextInvoiceNumber: 1 }))
    expect(await createInvoice(user.id, invoice(issuer.id))).toEqual({
      ok: false,
      error: 'number_taken',
    })
  })
})

describe('invoice contents', () => {
  it('computes and stores totals and ordered lines on the server', async () => {
    const { user, issuer } = await setup()
    const created = await createInvoice(user.id, invoice(issuer.id))
    if (!created.ok) throw new Error('create failed')
    const detail = await getInvoice(user.id, created.data.id)
    expect(detail).toMatchObject({
      subtotalMinor: 105_000,
      discountMinor: 5_000,
      taxMinor: 11_000,
      totalMinor: 111_000,
      status: 'draft',
      company: { name: 'Studio Rofiq', hasLogo: false },
    })
    expect(detail?.items.map((i) => [i.description, i.lineTotalMinor])).toEqual([
      ['Design system', 100_000],
      ['Support hours', 5_000],
    ])
  })

  it('edits drafts (replacing lines) but not sent or paid invoices', async () => {
    const { user, issuer } = await setup()
    const created = await createInvoice(user.id, invoice(issuer.id))
    if (!created.ok) throw new Error('create failed')
    const id = created.data.id

    const edited = invoice(issuer.id, {
      discountMinor: 0,
      taxRateBps: 0,
      items: [{ description: 'Single line', quantityMilli: 3000, unitPriceMinor: 1_000 }],
    })
    expect(await updateInvoice(user.id, id, edited)).toEqual({
      ok: true,
      data: { savedClient: false },
    })
    expect((await getInvoice(user.id, id))?.totalMinor).toBe(3_000)
    expect(await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id))).toHaveLength(
      1,
    )

    await setInvoiceStatus(user.id, id, 'sent')
    expect(await updateInvoice(user.id, id, edited)).toEqual({ ok: false, error: 'not_editable' })
    expect(await deleteInvoice(user.id, id)).toEqual({ ok: false, error: 'not_editable' })
  })

  it('moves through draft → sent → paid with timestamps and allows undo', async () => {
    const { user, issuer } = await setup()
    const created = await createInvoice(user.id, invoice(issuer.id))
    if (!created.ok) throw new Error('create failed')
    const id = created.data.id

    expect(await setInvoiceStatus(user.id, id, 'sent')).toEqual({ ok: true, data: undefined })
    const sent = await getInvoice(user.id, id)
    expect(sent?.sentAt).toBeInstanceOf(Date)
    expect(await setInvoiceStatus(user.id, id, 'paid')).toEqual({ ok: true, data: undefined })
    const paid = await getInvoice(user.id, id)
    expect(paid?.paidAt).toBeInstanceOf(Date)
    expect(paid?.sentAt?.getTime()).toBe(sent?.sentAt?.getTime())
    expect(await setInvoiceStatus(user.id, id, 'draft')).toEqual({
      ok: false,
      error: 'invalid_transition',
    })
    expect(await setInvoiceStatus(user.id, id, 'sent')).toEqual({ ok: true, data: undefined })
    expect((await getInvoice(user.id, id))?.paidAt).toBeNull()
  })

  it('lists, filters, and searches, and sums receivables', async () => {
    const { user, issuer } = await setup()
    const a = await createInvoice(
      user.id,
      invoice(issuer.id, { clientName: 'Acorn Studio', dueDate: '2026-10-08' }),
    )
    const b = await createInvoice(user.id, invoice(issuer.id, { clientName: 'Birch & Co' }))
    if (!a.ok || !b.ok) throw new Error('create failed')
    await setInvoiceStatus(user.id, a.data.id, 'sent')
    await setInvoiceStatus(user.id, b.data.id, 'sent')

    expect((await listInvoices(user.id, { q: 'birch' })).items.map((i) => i.clientName)).toEqual([
      'Birch & Co',
    ])
    expect((await listInvoices(user.id, { q: 'INV-0001' })).total).toBe(1)
    expect((await listInvoices(user.id, { status: 'draft' })).total).toBe(0)
    expect(await getReceivables(user.id, '2026-10-10')).toEqual([
      { currency: 'USD', outstandingMinor: 222_000, overdueMinor: 111_000, overdueCount: 1 },
    ])
  })
})

describe('companies', () => {
  it('cannot be deleted while they have invoices', async () => {
    const { user, issuer } = await setup()
    await createInvoice(user.id, invoice(issuer.id))
    expect(await deleteCompany(user.id, issuer.id)).toEqual({ ok: false, error: 'has_invoices' })
    const unused = await createCompany(user.id, company({ name: 'Unused' }))
    expect(await deleteCompany(user.id, unused.id)).toEqual({ ok: true, data: undefined })
  })
})

describe('invoice isolation', () => {
  it('keeps invoices and companies private and blocks invoicing from someone else’s company', async () => {
    const owner = await setup()
    const intruder = await createTestUser()
    const created = await createInvoice(owner.user.id, invoice(owner.issuer.id))
    if (!created.ok) throw new Error('create failed')

    expect(await getInvoice(intruder.id, created.data.id)).toBeNull()
    expect((await listInvoices(intruder.id)).items).toEqual([])
    expect(await getReceivables(intruder.id, '2030-01-01')).toEqual([])
    expect(await updateInvoice(intruder.id, created.data.id, invoice(owner.issuer.id))).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await setInvoiceStatus(intruder.id, created.data.id, 'sent')).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await deleteInvoice(intruder.id, created.data.id)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await createInvoice(intruder.id, invoice(owner.issuer.id))).toEqual({
      ok: false,
      error: 'company_not_found',
    })
    expect(await getCompany(intruder.id, owner.issuer.id)).toBeNull()
    expect(await deleteCompany(intruder.id, owner.issuer.id)).toEqual({
      ok: false,
      error: 'not_found',
    })

    // The owner's counter didn't move because of the intruder's attempt.
    expect((await getCompany(owner.user.id, owner.issuer.id))?.nextInvoiceNumber).toBe(2)
  })
})

describe('saving the client from an invoice', () => {
  const billTo = {
    clientName: 'Northwind Labs',
    clientAddress: 'Jl. Thamrin 10',
    clientEmail: 'ap@northwind.example',
    clientTaxId: '01.234.567.8-901.000',
  }

  it('adds the "Bill to" details to the company’s clients when asked', async () => {
    const { user, issuer } = await setup()
    const plain = await createInvoice(user.id, invoice(issuer.id, billTo))
    expect(plain.ok && plain.data.savedClient).toBe(false)
    expect(await listClients(user.id, issuer.id)).toEqual([])

    const saved = await createInvoice(user.id, invoice(issuer.id, billTo), { saveClient: true })
    expect(saved.ok && saved.data.savedClient).toBe(true)
    expect(await listClients(user.id, issuer.id)).toMatchObject([
      {
        name: 'Northwind Labs',
        address: 'Jl. Thamrin 10',
        email: 'ap@northwind.example',
        taxId: '01.234.567.8-901.000',
      },
    ])
  })

  it('leaves an existing client with that name as it is', async () => {
    const { user, issuer } = await setup()
    await createInvoice(user.id, invoice(issuer.id, billTo), { saveClient: true })
    const again = await createInvoice(
      user.id,
      invoice(issuer.id, { ...billTo, clientName: 'NORTHWIND LABS', clientEmail: 'new@x.example' }),
      { saveClient: true },
    )
    expect(again.ok && again.data.savedClient).toBe(false)
    expect(await listClients(user.id, issuer.id)).toMatchObject([
      { name: 'Northwind Labs', email: 'ap@northwind.example' },
    ])
  })

  it('saves from a draft being edited, to the invoice’s own company', async () => {
    const { user, issuer } = await setup()
    const other = await createCompany(user.id, company({ name: 'Side project' }))
    const created = await createInvoice(user.id, invoice(issuer.id))
    if (!created.ok) throw new Error('create failed')

    // The submitted company is ignored on edit; the invoice keeps its issuer.
    const edited = await updateInvoice(
      user.id,
      created.data.id,
      invoice(other.id, { ...billTo, clientName: 'Acme' }),
      { saveClient: true },
    )
    expect(edited).toEqual({ ok: true, data: { savedClient: true } })
    expect((await listClients(user.id, issuer.id)).map((c) => c.name)).toEqual(['Acme'])
    expect(await listClients(user.id, other.id)).toEqual([])
  })

  it('saves nothing for someone else’s company or invoice', async () => {
    const owner = await setup()
    const intruder = await createTestUser()
    const created = await createInvoice(owner.user.id, invoice(owner.issuer.id))
    if (!created.ok) throw new Error('create failed')

    expect(
      await createInvoice(intruder.id, invoice(owner.issuer.id, billTo), { saveClient: true }),
    ).toEqual({ ok: false, error: 'company_not_found' })
    expect(
      await updateInvoice(intruder.id, created.data.id, invoice(owner.issuer.id, billTo), {
        saveClient: true,
      }),
    ).toEqual({ ok: false, error: 'not_found' })
    expect(await listClients(owner.user.id, owner.issuer.id)).toEqual([])
  })
})
