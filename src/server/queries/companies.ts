import 'server-only'

import { and, asc, count, eq, sql } from 'drizzle-orm'

import { type CompanyInput } from '@/features/companies/schema'
import { err, ok, type Result } from '@/lib/result'

import { db } from '../db'
import { companies, invoices } from '../db/schema'
import { type ImageMime } from '../images'

/** Data access for companies (the user's issuing businesses), scoped by owner. */

const columns = {
  id: companies.id,
  name: companies.name,
  address: companies.address,
  taxId: companies.taxId,
  email: companies.email,
  defaultCurrency: companies.defaultCurrency,
  paymentDetails: companies.paymentDetails,
  invoicePrefix: companies.invoicePrefix,
  nextInvoiceNumber: companies.nextInvoiceNumber,
  hasLogo: sql<boolean>`${companies.logo} is not null`,
  logoUpdatedAt: companies.logoUpdatedAt,
}

export type Company = {
  id: string
  name: string
  address: string | null
  taxId: string | null
  email: string | null
  defaultCurrency: string
  paymentDetails: string | null
  invoicePrefix: string
  nextInvoiceNumber: number
  hasLogo: boolean
  logoUpdatedAt: Date | null
}

export type CompanyWithCount = Company & { invoiceCount: number }

export async function listCompanies(userId: string): Promise<CompanyWithCount[]> {
  return db
    .select({ ...columns, invoiceCount: count(invoices.id) })
    .from(companies)
    .leftJoin(invoices, eq(invoices.companyId, companies.id))
    .where(eq(companies.userId, userId))
    .groupBy(companies.id)
    .orderBy(asc(companies.name))
}

export async function getCompany(userId: string, id: string): Promise<Company | null> {
  const [row] = await db
    .select(columns)
    .from(companies)
    .where(and(eq(companies.userId, userId), eq(companies.id, id)))
    .limit(1)
  return row ?? null
}

export async function createCompany(userId: string, input: CompanyInput): Promise<Company> {
  const [row] = await db
    .insert(companies)
    .values({ ...input, userId })
    .returning(columns)
  return row!
}

export async function updateCompany(
  userId: string,
  id: string,
  input: CompanyInput,
): Promise<Company | null> {
  const [row] = await db
    .update(companies)
    .set(input)
    .where(and(eq(companies.userId, userId), eq(companies.id, id)))
    .returning(columns)
  return row ?? null
}

export async function deleteCompany(
  userId: string,
  id: string,
): Promise<Result<undefined, 'not_found' | 'has_invoices'>> {
  return db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.userId, userId), eq(companies.id, id)))
      .for('update')
    if (!owned) return err('not_found')
    const [used] = await tx
      .select({ total: count() })
      .from(invoices)
      .where(eq(invoices.companyId, id))
    if ((used?.total ?? 0) > 0) return err('has_invoices')
    await tx.delete(companies).where(eq(companies.id, id))
    return ok()
  })
}

export async function setCompanyLogo(
  userId: string,
  id: string,
  logo: { data: Buffer; mime: ImageMime } | null,
): Promise<boolean> {
  const updated = await db
    .update(companies)
    .set(
      logo
        ? { logo: logo.data, logoMime: logo.mime, logoUpdatedAt: new Date() }
        : { logo: null, logoMime: null, logoUpdatedAt: new Date() },
    )
    .where(and(eq(companies.userId, userId), eq(companies.id, id)))
    .returning({ id: companies.id })
  return updated.length > 0
}

export async function getCompanyLogo(
  userId: string,
  id: string,
): Promise<{ data: Buffer; mime: string; updatedAt: Date | null } | null> {
  const [row] = await db
    .select({ data: companies.logo, mime: companies.logoMime, updatedAt: companies.logoUpdatedAt })
    .from(companies)
    .where(and(eq(companies.userId, userId), eq(companies.id, id)))
    .limit(1)
  if (!row?.data || !row.mime) return null
  return { data: row.data, mime: row.mime, updatedAt: row.updatedAt }
}
