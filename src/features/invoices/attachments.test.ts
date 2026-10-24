import { PDFDocument } from 'pdf-lib'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { GET as downloadAttachment } from '@/app/api/invoices/[id]/attachments/[attachmentId]/route'
import { POST as upload } from '@/app/api/invoices/[id]/attachments/route'
import { GET as downloadPdf } from '@/app/api/invoices/[id]/pdf/route'
import { closeDb } from '@/server/db'
import { createCompany } from '@/server/queries/companies'
import { listInvoiceAttachments } from '@/server/queries/invoice-attachments'
import { createInvoice } from '@/server/queries/invoices'
import { closeRedis } from '@/server/redis'
import { closeStorage } from '@/server/storage'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'
import { makeEncryptedPdf, makePdf, pageSizes } from '@/server/testing/pdfs'

import { deleteInvoiceAttachmentAction, moveInvoiceAttachmentAction } from './actions'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
  closeStorage()
})
beforeEach(() => resetRequest())

const ORIGIN = 'http://localhost:3100' // APP_URL in .env.test
const A4: [number, number] = [595, 842]
const LETTER: [number, number] = [612, 792]
const RECEIPT: [number, number] = [300, 600]

function uploadRequest(
  invoiceId: string,
  file: Blob | null,
  { origin = ORIGIN, name = 'AWS invoice.pdf', headers = {} as Record<string, string> } = {},
) {
  const form = new FormData()
  if (file) form.append('file', file, name)
  return upload(
    new Request(`${ORIGIN}/api/invoices/${invoiceId}/attachments`, {
      method: 'POST',
      body: form,
      headers: { origin, ...headers },
    }),
    { params: Promise.resolve({ id: invoiceId }) },
  )
}

// Copied into a plain ArrayBuffer: Blob doesn't take views over shared memory.
const blobOf = (bytes: Uint8Array) => new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
const pdfBlob = async (pages = 1, size?: [number, number]) => blobOf(await makePdf(pages, size))

async function setup() {
  const user = await createTestUser()
  const company = await createCompany(user.id, {
    name: 'Studio Rofiq',
    address: null,
    taxId: null,
    email: null,
    defaultCurrency: 'USD',
    paymentDetails: null,
    bankName: null,
    bankAccountNumber: null,
    bankAccountName: null,
    invoicePrefix: 'ATT-',
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
    items: [
      { description: 'Hosting, passed on at cost', quantityMilli: 1000, unitPriceMinor: 12_000 },
    ],
  })
  if (!created.ok) throw new Error('setup')
  await signInAs(user.id)
  return { userId: user.id, invoiceId: created.data.id }
}

const errorOf = async (response: Response) => ((await response.json()) as { error: string }).error

describe('attaching a PDF', () => {
  it('stores it with a clean name and its page count', async () => {
    const { userId, invoiceId } = await setup()
    const response = await uploadRequest(invoiceId, await pdfBlob(3), {
      name: '../Downloads/AWS "Oct".pdf',
    })
    expect(response.status).toBe(201)
    expect(await listInvoiceAttachments(userId, invoiceId)).toMatchObject([
      { position: 0, fileName: 'AWS Oct.pdf', pageCount: 3 },
    ])
  })

  it('refuses anonymous requests, other sites, and other people’s invoices', async () => {
    const { invoiceId } = await setup()
    const file = await pdfBlob()
    expect((await uploadRequest(invoiceId, file, { origin: 'https://evil.example' })).status).toBe(
      403,
    )
    expect((await uploadRequest('not-a-uuid', file)).status).toBe(404)

    await signInAs((await createTestUser()).id)
    const foreign = await uploadRequest(invoiceId, file)
    expect([foreign.status, await errorOf(foreign)]).toEqual([404, 'not_found'])

    resetRequest()
    expect((await uploadRequest(invoiceId, file)).status).toBe(401)
  })

  it.each([
    ['no file', async () => null, 'invalid'],
    ['a renamed zip', async () => new Blob(['PK\u0003\u0004 not a pdf']), 'not_pdf'],
    ['a password-protected PDF', async () => blobOf(await makeEncryptedPdf()), 'encrypted'],
  ])('rejects %s with a reason the page can show', async (_label, makeFile, reason) => {
    const { userId, invoiceId } = await setup()
    const response = await uploadRequest(invoiceId, await makeFile())
    expect([response.status, await errorOf(response)]).toEqual([400, reason])
    expect(await listInvoiceAttachments(userId, invoiceId)).toEqual([])
  })

  it('rejects an oversized request before reading it', async () => {
    const { invoiceId } = await setup()
    const response = await uploadRequest(invoiceId, await pdfBlob(), {
      headers: { 'content-length': String(11 * 1024 * 1024) },
    })
    expect([response.status, await errorOf(response)]).toEqual([413, 'file_too_large'])
  })
})

describe('downloading', () => {
  it('appends the attachments to the invoice PDF, in order', async () => {
    const { invoiceId } = await setup()
    await uploadRequest(invoiceId, await pdfBlob(2, LETTER))
    await uploadRequest(invoiceId, await pdfBlob(1, RECEIPT))

    const response = await downloadPdf(new Request(`${ORIGIN}/api/invoices/${invoiceId}/pdf`), {
      params: Promise.resolve({ id: invoiceId }),
    })
    expect(response.status).toBe(200)
    const merged = new Uint8Array(await response.arrayBuffer())
    expect(await pageSizes(merged)).toEqual([A4, LETTER, LETTER, RECEIPT])
    // The invoice's own metadata survives the merge.
    expect((await PDFDocument.load(merged)).getTitle()).toBe('Invoice ATT-0001')
  })

  it('sends one attachment to its owner only, as a download', async () => {
    const { userId, invoiceId } = await setup()
    await uploadRequest(invoiceId, await pdfBlob(2), { name: 'Tagihan Biznet – Oktober.pdf' })
    const [attachment] = await listInvoiceAttachments(userId, invoiceId)
    const get = () =>
      downloadAttachment(new Request(`${ORIGIN}/api/invoices/${invoiceId}/attachments/x`), {
        params: Promise.resolve({ id: invoiceId, attachmentId: attachment!.id }),
      })

    const response = await get()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toMatch(
      /^attachment; filename="Tagihan Biznet _ Oktober.pdf"; filename\*=UTF-8''/,
    )
    expect(await pageSizes(new Uint8Array(await response.arrayBuffer()))).toHaveLength(2)

    await signInAs((await createTestUser()).id)
    expect((await get()).status).toBe(404)
  })
})

describe('attachment actions', () => {
  it('reorder and remove attachments, and validate their input', async () => {
    const { userId, invoiceId } = await setup()
    await uploadRequest(invoiceId, await pdfBlob(), { name: 'aws.pdf' })
    await uploadRequest(invoiceId, await pdfBlob(), { name: 'hetzner.pdf' })
    const [aws, hetzner] = await listInvoiceAttachments(userId, invoiceId)

    expect(await moveInvoiceAttachmentAction(invoiceId, hetzner!.id, 'up')).toEqual({
      ok: true,
      data: undefined,
    })
    expect(await moveInvoiceAttachmentAction(invoiceId, aws!.id, 'sideways')).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(await deleteInvoiceAttachmentAction(invoiceId, aws!.id)).toEqual({
      ok: true,
      data: undefined,
    })
    expect(await deleteInvoiceAttachmentAction(invoiceId, 'nope')).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect((await listInvoiceAttachments(userId, invoiceId)).map((a) => a.fileName)).toEqual([
      'hetzner.pdf',
    ])
  })
})
