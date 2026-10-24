import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { companies, invoiceAttachments, invoiceItems, invoices } from '.'

afterAll(closeDb)

async function setup() {
  const user = await createTestUser()
  const [company] = await db
    .insert(companies)
    .values({ userId: user.id, name: 'Studio Rofiq', defaultCurrency: 'USD' })
    .returning()
  return { user, company: company! }
}

function invoice(
  userId: string,
  companyId: string,
  overrides: Partial<typeof invoices.$inferInsert> = {},
) {
  return {
    userId,
    companyId,
    number: 1,
    numberLabel: 'INV-0001',
    issueDate: '2026-10-07',
    dueDate: '2026-10-21',
    currency: 'USD',
    clientName: 'Northwind Labs',
    subtotalMinor: 100_000,
    discountMinor: 5_000,
    taxRateBps: 1100,
    taxMinor: 10_450,
    totalMinor: 105_450,
    ...overrides,
  }
}

describe('companies table', () => {
  it('defaults the numbering and prefix', async () => {
    const { company } = await setup()
    expect(company).toMatchObject({ invoicePrefix: 'INV-', nextInvoiceNumber: 1, logo: null })
  })

  it('stores a logo with its type, and rejects a logo without one', async () => {
    const { company } = await setup()
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    const [withLogo] = await db
      .update(companies)
      .set({ logo: png, logoMime: 'image/png' })
      .where(eq(companies.id, company.id))
      .returning()
    expect(Buffer.isBuffer(withLogo?.logo)).toBe(true)
    expect(withLogo?.logo?.equals(png)).toBe(true)
    await expect(
      db.update(companies).set({ logoMime: null }).where(eq(companies.id, company.id)),
    ).rejects.toThrow()
    await expect(
      db.update(companies).set({ logoMime: 'image/svg+xml' }).where(eq(companies.id, company.id)),
    ).rejects.toThrow()
  })
})

describe('invoices table', () => {
  it('keeps numbers unique per company', async () => {
    const { user, company } = await setup()
    await db.insert(invoices).values(invoice(user.id, company.id))
    await expect(db.insert(invoices).values(invoice(user.id, company.id))).rejects.toThrow()
  })

  it.each([
    ['inconsistent totals', { totalMinor: 1 }],
    ['a discount above the subtotal', { discountMinor: 200_000, totalMinor: -89_550 }],
    ['a due date before the issue date', { dueDate: '2026-10-06' }],
    ['a tax rate above 100%', { taxRateBps: 10_001 }],
    ['paid without timestamps', { status: 'paid' as const }],
    ['sent without a sent timestamp', { status: 'sent' as const }],
  ])('rejects %s', async (_label, override) => {
    const { user, company } = await setup()
    await expect(
      db.insert(invoices).values(invoice(user.id, company.id, override)),
    ).rejects.toThrow()
  })

  it('accepts a paid invoice with both timestamps', async () => {
    const { user, company } = await setup()
    const now = new Date()
    await expect(
      db
        .insert(invoices)
        .values(invoice(user.id, company.id, { status: 'paid', sentAt: now, paidAt: now })),
    ).resolves.toBeDefined()
  })

  it('protects companies that have invoices and cascades items with their invoice', async () => {
    const { user, company } = await setup()
    const [row] = await db.insert(invoices).values(invoice(user.id, company.id)).returning()
    await db.insert(invoiceItems).values({
      userId: user.id,
      invoiceId: row!.id,
      position: 0,
      description: 'Design system',
      quantityMilli: 1000,
      unitPriceMinor: 100_000,
      lineTotalMinor: 100_000,
    })
    await expect(db.delete(companies).where(eq(companies.id, company.id))).rejects.toThrow()
    await db.delete(invoices).where(eq(invoices.id, row!.id))
    expect(await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, row!.id))).toEqual(
      [],
    )
  })
})

describe('invoice_attachments table', () => {
  async function withInvoice() {
    const { user, company } = await setup()
    const [row] = await db.insert(invoices).values(invoice(user.id, company.id)).returning()
    const attachment = (overrides: Partial<typeof invoiceAttachments.$inferInsert> = {}) => {
      const attachmentId = crypto.randomUUID()
      return {
        id: attachmentId,
        userId: user.id,
        invoiceId: row!.id,
        position: 0,
        fileName: 'aws-invoice-october.pdf',
        objectKey: `${user.id}/${row!.id}/${attachmentId}.pdf`,
        sizeBytes: 48_213,
        pageCount: 2,
        ...overrides,
      }
    }
    return { invoiceId: row!.id, attachment }
  }

  it('stores attachments in order and removes them with their invoice', async () => {
    const { invoiceId, attachment } = await withInvoice()
    await db
      .insert(invoiceAttachments)
      .values([attachment({ position: 1, fileName: 'second.pdf' }), attachment({ position: 0 })])
    const rows = await db
      .select()
      .from(invoiceAttachments)
      .where(eq(invoiceAttachments.invoiceId, invoiceId))
      .orderBy(invoiceAttachments.position)
    expect(rows.map((r) => r.fileName)).toEqual(['aws-invoice-october.pdf', 'second.pdf'])

    await db.delete(invoices).where(eq(invoices.id, invoiceId))
    expect(
      await db.select().from(invoiceAttachments).where(eq(invoiceAttachments.invoiceId, invoiceId)),
    ).toEqual([])
  })

  it.each([
    ['a blank file name', { fileName: '   ' }],
    ['an empty file', { sizeBytes: 0 }],
    ['a file over 10 MiB', { sizeBytes: 10 * 1024 * 1024 + 1 }],
    ['zero pages', { pageCount: 0 }],
    ['more than 200 pages', { pageCount: 201 }],
    ['a position outside 0–199', { position: 200 }],
    ['an object key outside the owner’s folder', { objectKey: '../secrets.pdf' }],
    ['an object key that is not a PDF', { objectKey: `${crypto.randomUUID()}/x/y.exe` }],
  ])('rejects %s', async (_label, overrides) => {
    const { attachment } = await withInvoice()
    await expect(db.insert(invoiceAttachments).values(attachment(overrides))).rejects.toThrow()
  })

  it('keeps positions and object keys unique', async () => {
    const { attachment } = await withInvoice()
    const first = attachment()
    await db.insert(invoiceAttachments).values(first)
    await expect(db.insert(invoiceAttachments).values(attachment())).rejects.toThrow()
    await expect(
      db.insert(invoiceAttachments).values(attachment({ position: 1, objectKey: first.objectKey })),
    ).rejects.toThrow()
  })
})

describe('company bank account', () => {
  const setBank = async (bankName: string | null, bankAccountNumber: string | null) => {
    const { company } = await setup()
    return db
      .update(companies)
      .set({ bankName, bankAccountNumber })
      .where(eq(companies.id, company.id))
      .returning({ bankName: companies.bankName, number: companies.bankAccountNumber })
  }

  it('is optional, and stores a name with its account number', async () => {
    const { company } = await setup()
    expect(company).toMatchObject({ bankName: null, bankAccountNumber: null })
    expect(await setBank('Bank Central Asia', '123-456-7890')).toEqual([
      { bankName: 'Bank Central Asia', number: '123-456-7890' },
    ])
    expect(await setBank('Deutsche Bank', 'DE89 3704 0044 0532 0130 00')).toHaveLength(1)
    expect(await setBank(null, null)).toEqual([{ bankName: null, number: null }])
  })

  it.each([
    ['a bank without an account number (the NULL case)', 'Bank Central Asia', null],
    ['an account number without a bank (the NULL case)', null, '1234567890'],
    ['a blank bank name', '   ', '1234567890'],
    ['an account number under 4 characters', 'BCA', '123'],
    ['an account number over 40 characters', 'BCA', '1'.repeat(41)],
    ['an account number with other symbols', 'BCA', '1234/5678'],
    ['an account number with a trailing space', 'BCA', '1234 5678 '],
    ['an account number with doubled separators', 'BCA', '1234  5678'],
  ])('rejects %s', async (_label, bankName, number) => {
    await expect(setBank(bankName, number)).rejects.toThrow()
  })
})
