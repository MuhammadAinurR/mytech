import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { closeDb, db } from '../db'
import { invoiceAttachments } from '../db/schema'
import { closeStorage, getObject, ObjectNotFoundError } from '../storage'
import { createTestUser } from '../testing/factories'
import { createCompany } from './companies'
import {
  addInvoiceAttachment,
  deleteInvoiceAttachment,
  listInvoiceAttachments,
  moveInvoiceAttachment,
  readInvoiceAttachmentFile,
  readInvoiceAttachmentFiles,
} from './invoice-attachments'
import { createInvoice, deleteInvoice, setInvoiceStatus } from './invoices'

afterAll(async () => {
  await closeDb()
  closeStorage()
})

async function setup() {
  const user = await createTestUser()
  const company = await createCompany(user.id, {
    name: 'Studio Rofiq',
    address: null,
    taxId: null,
    email: null,
    defaultCurrency: 'USD',
    paymentDetails: null,
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
    items: [{ description: 'Hosting', quantityMilli: 1000, unitPriceMinor: 10_000 }],
  })
  if (!created.ok) throw new Error('setup')
  return { userId: user.id, invoiceId: created.data.id }
}

const file = (fileName: string, size = 64, fill = 1) => ({
  fileName,
  bytes: new Uint8Array(size).fill(fill),
  pageCount: 1,
})

async function attach(userId: string, invoiceId: string, ...names: string[]) {
  const ids: string[] = []
  for (const [index, name] of names.entries()) {
    const result = await addInvoiceAttachment(userId, invoiceId, file(name, 64, index + 1))
    if (!result.ok) throw new Error(result.error)
    ids.push(result.data.id)
  }
  return ids
}

const names = async (userId: string, invoiceId: string) =>
  (await listInvoiceAttachments(userId, invoiceId)).map((a) => `${a.position}:${a.fileName}`)

describe('invoice attachments', () => {
  it('stores files in order and reads them back in that order', async () => {
    const { userId, invoiceId } = await setup()
    await attach(userId, invoiceId, 'aws.pdf', 'hetzner.pdf')
    expect(await names(userId, invoiceId)).toEqual(['0:aws.pdf', '1:hetzner.pdf'])
    const files = await readInvoiceAttachmentFiles(userId, invoiceId)
    expect(files.map((bytes) => bytes[0])).toEqual([1, 2])
  })

  it('stops at 10 files and at 25 MB together', async () => {
    const { userId, invoiceId } = await setup()
    await attach(userId, invoiceId, ...Array.from({ length: 10 }, (_, i) => `${i}.pdf`))
    expect(await addInvoiceAttachment(userId, invoiceId, file('11.pdf'))).toEqual({
      ok: false,
      error: 'too_many',
    })

    const other = await setup()
    const nineMb = 9 * 1024 * 1024
    for (const name of ['a.pdf', 'b.pdf']) {
      expect(
        (await addInvoiceAttachment(other.userId, other.invoiceId, file(name, nineMb))).ok,
      ).toBe(true)
    }
    expect(
      await addInvoiceAttachment(other.userId, other.invoiceId, file('c.pdf', nineMb)),
    ).toEqual({ ok: false, error: 'too_large' })
  })

  it('keeps each owner’s attachments private', async () => {
    const owner = await setup()
    const intruder = await setup()
    const [id] = await attach(owner.userId, owner.invoiceId, 'aws.pdf')

    expect(await addInvoiceAttachment(intruder.userId, owner.invoiceId, file('x.pdf'))).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await listInvoiceAttachments(intruder.userId, owner.invoiceId)).toEqual([])
    expect(await readInvoiceAttachmentFile(intruder.userId, owner.invoiceId, id!)).toBeNull()
    expect(await readInvoiceAttachmentFiles(intruder.userId, owner.invoiceId)).toEqual([])
    expect(await deleteInvoiceAttachment(intruder.userId, owner.invoiceId, id!)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await moveInvoiceAttachment(intruder.userId, owner.invoiceId, id!, 'down')).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await names(owner.userId, owner.invoiceId)).toEqual(['0:aws.pdf'])
  })

  it('deletes the row and the stored file, then closes the gap', async () => {
    const { userId, invoiceId } = await setup()
    const [, middle] = await attach(userId, invoiceId, 'a.pdf', 'b.pdf', 'c.pdf', 'd.pdf')
    const [stored] = await db
      .select({ objectKey: invoiceAttachments.objectKey })
      .from(invoiceAttachments)
      .where(eq(invoiceAttachments.id, middle!))

    expect(await deleteInvoiceAttachment(userId, invoiceId, middle!)).toEqual({
      ok: true,
      data: undefined,
    })
    expect(await names(userId, invoiceId)).toEqual(['0:a.pdf', '1:c.pdf', '2:d.pdf'])
    await expect(getObject(stored!.objectKey)).rejects.toBeInstanceOf(ObjectNotFoundError)
    // The next upload goes at the end again.
    await attach(userId, invoiceId, 'e.pdf')
    expect(await names(userId, invoiceId)).toEqual(['0:a.pdf', '1:c.pdf', '2:d.pdf', '3:e.pdf'])
  })

  it('moves an attachment up or down, and does nothing past either end', async () => {
    const { userId, invoiceId } = await setup()
    const [first, , last] = await attach(userId, invoiceId, 'a.pdf', 'b.pdf', 'c.pdf')

    await moveInvoiceAttachment(userId, invoiceId, last!, 'up')
    expect(await names(userId, invoiceId)).toEqual(['0:a.pdf', '1:c.pdf', '2:b.pdf'])
    await moveInvoiceAttachment(userId, invoiceId, first!, 'down')
    expect(await names(userId, invoiceId)).toEqual(['0:c.pdf', '1:a.pdf', '2:b.pdf'])

    const unchanged = await names(userId, invoiceId)
    const current = await listInvoiceAttachments(userId, invoiceId)
    for (const [id, direction] of [
      [current[0]!.id, 'up'],
      [current.at(-1)!.id, 'down'],
    ] as const) {
      expect(await moveInvoiceAttachment(userId, invoiceId, id, direction)).toEqual({
        ok: true,
        data: undefined,
      })
    }
    expect(await names(userId, invoiceId)).toEqual(unchanged)
  })

  it('removes stored files with their draft, and keeps them on sent invoices', async () => {
    const { userId, invoiceId } = await setup()
    await attach(userId, invoiceId, 'a.pdf', 'b.pdf')
    const keys = (
      await db
        .select({ objectKey: invoiceAttachments.objectKey })
        .from(invoiceAttachments)
        .where(eq(invoiceAttachments.invoiceId, invoiceId))
    ).map((row) => row.objectKey)

    expect(await deleteInvoice(userId, invoiceId)).toEqual({ ok: true, data: undefined })
    for (const key of keys) {
      await expect(getObject(key)).rejects.toBeInstanceOf(ObjectNotFoundError)
    }

    const sent = await setup()
    await attach(sent.userId, sent.invoiceId, 'kept.pdf')
    await setInvoiceStatus(sent.userId, sent.invoiceId, 'sent')
    expect(await deleteInvoice(sent.userId, sent.invoiceId)).toEqual({
      ok: false,
      error: 'not_editable',
    })
    expect(await readInvoiceAttachmentFiles(sent.userId, sent.invoiceId)).toHaveLength(1)
  })
})
