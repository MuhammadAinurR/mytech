import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { companies, invoiceItems, invoices } from '.'

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
