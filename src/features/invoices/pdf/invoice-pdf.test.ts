import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { GET } from '@/app/api/invoices/[id]/pdf/route'
import { closeDb } from '@/server/db'
import { createCompany, updateCompany } from '@/server/queries/companies'
import { createInvoice, getInvoice, setInvoiceStatus } from '@/server/queries/invoices'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'

import { invoicePdfDocument, pdfFilename, renderInvoicePdf } from './invoice-pdf'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

const request = (id: string) =>
  GET(new Request(`http://localhost/api/invoices/${id}/pdf`), { params: Promise.resolve({ id }) })

async function setup() {
  const user = await createTestUser()
  const company = await createCompany(user.id, {
    name: 'Studio Rofiq',
    address: 'Jakarta',
    taxId: null,
    email: null,
    defaultCurrency: 'USD',
    paymentDetails: 'Bank Example',
    bankName: null,
    bankAccountNumber: null,
    bankAccountName: null,
    invoicePrefix: 'PDF-',
    nextInvoiceNumber: 7,
  })
  const created = await createInvoice(user.id, {
    companyId: company.id,
    issueDate: '2026-10-07',
    dueDate: '2026-10-21',
    currency: 'USD',
    clientName: 'Northwind Labs',
    clientAddress: null,
    clientEmail: null,
    clientTaxId: null,
    notes: 'Thanks',
    taxRateBps: 1100,
    discountMinor: 0,
    items: [{ description: 'Design system', quantityMilli: 1000, unitPriceMinor: 100_000 }],
  })
  if (!created.ok) throw new Error('setup failed')
  return { user, invoiceId: created.data.id }
}

describe('invoice PDF route', () => {
  it('renders a real PDF for the owner with a safe download filename', async () => {
    const { user, invoiceId } = await setup()
    await signInAs(user.id)
    const response = await request(invoiceId)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="PDF-0007.pdf"')
    expect(response.headers.get('cache-control')).toBe('private, no-store')

    const bytes = Buffer.from(await response.arrayBuffer())
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(5_000)
    // Document metadata is stored uncompressed.
    expect(bytes.toString('latin1')).toContain('Invoice PDF-0007')
  })

  it('refuses anonymous requests and other users', async () => {
    const { invoiceId } = await setup()
    expect((await request(invoiceId)).status).toBe(401)
    const intruder = await createTestUser()
    await signInAs(intruder.id)
    expect((await request(invoiceId)).status).toBe(404)
    expect((await request('not-a-uuid')).status).toBe(404)
  })
})

/** All text in a react-pdf element tree (the PDF's own text is compressed). */
function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object' && 'props' in node) {
    return textOf((node as { props: { children?: unknown } }).props.children)
  }
  return ''
}

describe('bank transfer instruction', () => {
  it('asks unpaid invoices to be paid into the company’s account, and not paid ones', async () => {
    const { user, invoiceId } = await setup()
    const invoice = await getInvoice(user.id, invoiceId)
    if (!invoice) throw new Error('setup failed')
    await updateCompany(user.id, invoice.company.id, {
      name: 'Studio Rofiq',
      address: 'Jakarta',
      taxId: null,
      email: null,
      defaultCurrency: 'USD',
      paymentDetails: 'Payment due within 14 days.',
      bankName: 'BNI',
      bankAccountNumber: '0123 4567 89',
      bankAccountName: 'PT Studio Rofiq',
      invoicePrefix: 'PDF-',
      nextInvoiceNumber: 8,
    })

    const unpaid = (await getInvoice(user.id, invoiceId))!
    const text = textOf(invoicePdfDocument(unpaid, null))
    // No-break spaces keep the account number on one line.
    expect(text).toContain(
      'Please transfer payment to BNI, account number 0123 4567 89, in the name of PT Studio Rofiq.',
    )
    expect(text).toContain('Payment due within 14 days.')
    // The nested mono run renders, not just builds.
    expect((await renderInvoicePdf(unpaid, null)).subarray(0, 5).toString()).toBe('%PDF-')

    await setInvoiceStatus(user.id, invoiceId, 'sent')
    await setInvoiceStatus(user.id, invoiceId, 'paid')
    const paid = textOf(invoicePdfDocument((await getInvoice(user.id, invoiceId))!, null))
    expect(paid).not.toContain('Please transfer payment')
    expect(paid).toContain('Payment due within 14 days.')
  })
})

describe('pdfFilename', () => {
  it('keeps numbers readable and strips anything unsafe', () => {
    expect(pdfFilename('SR-0042')).toBe('SR-0042.pdf')
    expect(pdfFilename('KK/2026/0001')).toBe('KK-2026-0001.pdf')
    expect(pdfFilename('"; rm -rf /')).toBe('rm-rf.pdf')
    expect(pdfFilename('///')).toBe('invoice.pdf')
  })
})
