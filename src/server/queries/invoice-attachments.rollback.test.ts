import { afterAll, describe, expect, it, vi } from 'vitest'

import { closeDb } from '../db'
import { createTestUser } from '../testing/factories'
import { createCompany } from './companies'
import { addInvoiceAttachment, listInvoiceAttachments } from './invoice-attachments'
import { createInvoice } from './invoices'

// Storage that is down: every upload fails.
vi.mock('../storage', () => ({
  putObject: vi.fn(async () => {
    throw new Error('storage unavailable')
  }),
  getObject: vi.fn(),
  deleteObjects: vi.fn(),
}))

afterAll(closeDb)

describe('adding an attachment while storage is down', () => {
  it('fails without leaving a row behind', async () => {
    const user = await createTestUser()
    const company = await createCompany(user.id, {
      name: 'Studio Rofiq',
      address: null,
      taxId: null,
      email: null,
      defaultCurrency: 'USD',
      paymentDetails: null,
      invoicePrefix: 'RB-',
      nextInvoiceNumber: 1,
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
      notes: null,
      taxRateBps: 0,
      discountMinor: 0,
      items: [{ description: 'Hosting', quantityMilli: 1000, unitPriceMinor: 10_000 }],
    })
    if (!created.ok) throw new Error('setup')

    await expect(
      addInvoiceAttachment(user.id, created.data.id, {
        fileName: 'aws.pdf',
        bytes: new Uint8Array([1, 2, 3]),
        pageCount: 1,
      }),
    ).rejects.toThrow('storage unavailable')
    expect(await listInvoiceAttachments(user.id, created.data.id)).toEqual([])
  })
})
