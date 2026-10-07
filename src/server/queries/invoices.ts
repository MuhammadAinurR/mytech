import 'server-only'

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'

import { computeTotals, formatInvoiceNumber } from '@/features/invoices/lib/totals'
import { type InvoiceInput, type InvoiceStatus } from '@/features/invoices/schema'
import { err, ok, type Result } from '@/lib/result'

import { db, type Tx } from '../db'
import { isUniqueViolation } from '../db/errors'
import { companies, invoiceItems, invoices } from '../db/schema'

/**
 * Data access for invoices, scoped by owner. Numbers come from the issuing
 * company's counter, incremented under a row lock inside the same transaction
 * as the insert, so concurrent creates can never share a number. Totals are
 * always computed here from the line items, never trusted from the client.
 */

export const INVOICES_PAGE_SIZE = 25

const listColumns = {
  id: invoices.id,
  numberLabel: invoices.numberLabel,
  status: invoices.status,
  issueDate: invoices.issueDate,
  dueDate: invoices.dueDate,
  currency: invoices.currency,
  clientName: invoices.clientName,
  totalMinor: invoices.totalMinor,
  companyId: invoices.companyId,
  companyName: companies.name,
}

export type InvoiceListItem = {
  id: string
  numberLabel: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  currency: string
  clientName: string
  totalMinor: number
  companyId: string
  companyName: string
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export async function listInvoices(
  userId: string,
  options: { status?: InvoiceStatus; q?: string; page?: number; pageSize?: number } = {},
): Promise<{ items: InvoiceListItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = options.pageSize ?? INVOICES_PAGE_SIZE
  const page = Math.max(1, options.page ?? 1)
  const conditions: (SQL | undefined)[] = [eq(invoices.userId, userId)]
  if (options.status) conditions.push(eq(invoices.status, options.status))
  if (options.q) {
    const pattern = `%${escapeLike(options.q)}%`
    conditions.push(or(ilike(invoices.clientName, pattern), ilike(invoices.numberLabel, pattern)))
  }
  const where = and(...conditions)

  const [items, [totals]] = await Promise.all([
    db
      .select(listColumns)
      .from(invoices)
      .innerJoin(companies, eq(companies.id, invoices.companyId))
      .where(where)
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(invoices).where(where),
  ])
  return { items, total: totals?.total ?? 0, page, pageSize }
}

export type InvoiceDetail = {
  id: string
  number: number
  numberLabel: string
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  currency: string
  clientName: string
  clientAddress: string | null
  clientEmail: string | null
  clientTaxId: string | null
  notes: string | null
  taxRateBps: number
  discountMinor: number
  subtotalMinor: number
  taxMinor: number
  totalMinor: number
  sentAt: Date | null
  paidAt: Date | null
  company: {
    id: string
    name: string
    address: string | null
    taxId: string | null
    email: string | null
    paymentDetails: string | null
    hasLogo: boolean
    logoUpdatedAt: Date | null
  }
  items: {
    id: string
    description: string
    quantityMilli: number
    unitPriceMinor: number
    lineTotalMinor: number
  }[]
}

export async function getInvoice(userId: string, id: string): Promise<InvoiceDetail | null> {
  const [row] = await db
    .select({
      invoice: invoices,
      company: {
        id: companies.id,
        name: companies.name,
        address: companies.address,
        taxId: companies.taxId,
        email: companies.email,
        paymentDetails: companies.paymentDetails,
        hasLogo: sql<boolean>`${companies.logo} is not null`,
        logoUpdatedAt: companies.logoUpdatedAt,
      },
    })
    .from(invoices)
    .innerJoin(companies, eq(companies.id, invoices.companyId))
    .where(and(eq(invoices.userId, userId), eq(invoices.id, id)))
    .limit(1)
  if (!row) return null

  const items = await db
    .select({
      id: invoiceItems.id,
      description: invoiceItems.description,
      quantityMilli: invoiceItems.quantityMilli,
      unitPriceMinor: invoiceItems.unitPriceMinor,
      lineTotalMinor: invoiceItems.lineTotalMinor,
    })
    .from(invoiceItems)
    .where(and(eq(invoiceItems.userId, userId), eq(invoiceItems.invoiceId, id)))
    .orderBy(asc(invoiceItems.position))

  const { invoice } = row
  return {
    id: invoice.id,
    number: invoice.number,
    numberLabel: invoice.numberLabel,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    clientName: invoice.clientName,
    clientAddress: invoice.clientAddress,
    clientEmail: invoice.clientEmail,
    clientTaxId: invoice.clientTaxId,
    notes: invoice.notes,
    taxRateBps: invoice.taxRateBps,
    discountMinor: invoice.discountMinor,
    subtotalMinor: invoice.subtotalMinor,
    taxMinor: invoice.taxMinor,
    totalMinor: invoice.totalMinor,
    sentAt: invoice.sentAt,
    paidAt: invoice.paidAt,
    company: row.company,
    items,
  }
}

function priced(input: InvoiceInput) {
  const totals = computeTotals({
    lines: input.items,
    taxRateBps: input.taxRateBps,
    discountMinor: input.discountMinor,
  })
  return {
    fields: {
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency: input.currency,
      clientName: input.clientName,
      clientAddress: input.clientAddress,
      clientEmail: input.clientEmail,
      clientTaxId: input.clientTaxId,
      notes: input.notes,
      taxRateBps: input.taxRateBps,
      discountMinor: totals.discountMinor,
      subtotalMinor: totals.subtotalMinor,
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
    },
    lineTotals: totals.lineTotals,
  }
}

async function writeItems(
  tx: Tx,
  userId: string,
  invoiceId: string,
  input: InvoiceInput,
  lineTotals: number[],
) {
  await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
  await tx.insert(invoiceItems).values(
    input.items.map((item, position) => ({
      userId,
      invoiceId,
      position,
      description: item.description,
      quantityMilli: item.quantityMilli,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: lineTotals[position]!,
    })),
  )
}

export async function createInvoice(
  userId: string,
  input: InvoiceInput,
): Promise<Result<{ id: string; numberLabel: string }, 'company_not_found' | 'number_taken'>> {
  try {
    return await db.transaction(async (tx) => {
      // Claim the next number; the row lock serializes concurrent creates.
      const [claimed] = await tx
        .update(companies)
        .set({ nextInvoiceNumber: sql`${companies.nextInvoiceNumber} + 1` })
        .where(and(eq(companies.userId, userId), eq(companies.id, input.companyId)))
        .returning({
          number: sql<number>`${companies.nextInvoiceNumber} - 1`,
          prefix: companies.invoicePrefix,
        })
      if (!claimed) return err('company_not_found')

      const { fields, lineTotals } = priced(input)
      const numberLabel = formatInvoiceNumber(claimed.prefix, claimed.number)
      const [created] = await tx
        .insert(invoices)
        .values({
          ...fields,
          userId,
          companyId: input.companyId,
          number: claimed.number,
          numberLabel,
        })
        .returning({ id: invoices.id })
      await writeItems(tx, userId, created!.id, input, lineTotals)
      return ok({ id: created!.id, numberLabel })
    })
  } catch (error) {
    // Only possible if the counter was manually set back onto an existing number.
    if (isUniqueViolation(error, 'invoices_company_number_key')) return err('number_taken')
    throw error
  }
}

/** Drafts only; the issuing company (and so the number) never changes. */
export async function updateInvoice(
  userId: string,
  id: string,
  input: InvoiceInput,
): Promise<Result<undefined, 'not_found' | 'not_editable'>> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.id, id)))
      .for('update')
    if (!current) return err('not_found')
    if (current.status !== 'draft') return err('not_editable')

    const { fields, lineTotals } = priced(input)
    await tx.update(invoices).set(fields).where(eq(invoices.id, id))
    await writeItems(tx, userId, id, input, lineTotals)
    return ok()
  })
}

const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'paid'],
  sent: ['draft', 'paid'],
  paid: ['sent'],
}

export async function setInvoiceStatus(
  userId: string,
  id: string,
  next: InvoiceStatus,
): Promise<Result<undefined, 'not_found' | 'invalid_transition'>> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: invoices.status, sentAt: invoices.sentAt })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.id, id)))
      .for('update')
    if (!current) return err('not_found')
    if (!TRANSITIONS[current.status].includes(next)) return err('invalid_transition')

    const now = new Date()
    const timestamps =
      next === 'draft'
        ? { sentAt: null, paidAt: null }
        : next === 'sent'
          ? { sentAt: current.sentAt ?? now, paidAt: null }
          : { sentAt: current.sentAt ?? now, paidAt: now }
    await tx
      .update(invoices)
      .set({ status: next, ...timestamps })
      .where(eq(invoices.id, id))
    return ok()
  })
}

/** Drafts only: sent and paid invoices are part of the record. */
export async function deleteInvoice(
  userId: string,
  id: string,
): Promise<Result<undefined, 'not_found' | 'not_editable'>> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.id, id)))
      .for('update')
    if (!current) return err('not_found')
    if (current.status !== 'draft') return err('not_editable')
    await tx.delete(invoices).where(eq(invoices.id, id))
    return ok()
  })
}

export type ReceivablesSummary = {
  currency: string
  outstandingMinor: number
  overdueMinor: number
  overdueCount: number
}

/** Sent-but-unpaid totals per currency, with the overdue share as of `today`. */
export async function getReceivables(userId: string, today: string): Promise<ReceivablesSummary[]> {
  return db
    .select({
      currency: invoices.currency,
      outstandingMinor: sql<number>`coalesce(sum(${invoices.totalMinor}), 0)::bigint`.mapWith(
        Number,
      ),
      overdueMinor:
        sql<number>`coalesce(sum(${invoices.totalMinor}) filter (where ${invoices.dueDate} < ${today}), 0)::bigint`.mapWith(
          Number,
        ),
      overdueCount: sql<number>`count(*) filter (where ${invoices.dueDate} < ${today})`.mapWith(
        Number,
      ),
    })
    .from(invoices)
    .where(and(eq(invoices.userId, userId), eq(invoices.status, 'sent')))
    .groupBy(invoices.currency)
    .orderBy(asc(invoices.currency))
}

/** Sent, unpaid invoices, soonest due first (overdue ones lead). */
export async function listDueInvoices(userId: string, limit = 5): Promise<InvoiceListItem[]> {
  return db
    .select(listColumns)
    .from(invoices)
    .innerJoin(companies, eq(companies.id, invoices.companyId))
    .where(and(eq(invoices.userId, userId), eq(invoices.status, 'sent')))
    .orderBy(asc(invoices.dueDate), asc(invoices.number))
    .limit(limit)
}
