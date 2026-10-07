import 'server-only'

import { and, asc, eq, sql } from 'drizzle-orm'

import { type ClientInput } from '@/features/clients/schema'
import { err, ok, type Result } from '@/lib/result'

import { db } from '../db'
import { isUniqueViolation } from '../db/errors'
import { clients, companies } from '../db/schema'

/** Data access for saved clients (per issuing company), scoped by owner. */

const columns = {
  id: clients.id,
  companyId: clients.companyId,
  name: clients.name,
  address: clients.address,
  email: clients.email,
  taxId: clients.taxId,
}

export type Client = {
  id: string
  companyId: string
  name: string
  address: string | null
  email: string | null
  taxId: string | null
}

const byName = asc(sql`lower(${clients.name})`)

/** One company's clients, alphabetical. Empty if the company isn't the user's. */
export async function listClients(userId: string, companyId: string): Promise<Client[]> {
  return db
    .select(columns)
    .from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.companyId, companyId)))
    .orderBy(byName)
}

/** Every client the user has saved, alphabetical within each company (for the invoice editor). */
export async function listAllClients(userId: string): Promise<Client[]> {
  return db
    .select(columns)
    .from(clients)
    .where(eq(clients.userId, userId))
    .orderBy(asc(clients.companyId), byName)
}

export async function createClient(
  userId: string,
  companyId: string,
  input: ClientInput,
): Promise<Result<Client, 'company_not_found' | 'name_taken'>> {
  try {
    return await db.transaction(async (tx) => {
      const [company] = await tx
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies.userId, userId), eq(companies.id, companyId)))
      if (!company) return err('company_not_found')
      const [row] = await tx
        .insert(clients)
        .values({ ...input, userId, companyId })
        .returning(columns)
      return ok(row!)
    })
  } catch (error) {
    if (isUniqueViolation(error, 'clients_company_name_key')) return err('name_taken')
    throw error
  }
}

export async function updateClient(
  userId: string,
  id: string,
  input: ClientInput,
): Promise<Result<Client, 'not_found' | 'name_taken'>> {
  try {
    const [row] = await db
      .update(clients)
      .set(input)
      .where(and(eq(clients.userId, userId), eq(clients.id, id)))
      .returning(columns)
    return row ? ok(row) : err('not_found')
  } catch (error) {
    if (isUniqueViolation(error, 'clients_company_name_key')) return err('name_taken')
    throw error
  }
}

/** Returns the deleted client's company, or null if there was nothing to delete. */
export async function deleteClient(
  userId: string,
  id: string,
): Promise<{ companyId: string } | null> {
  const [row] = await db
    .delete(clients)
    .where(and(eq(clients.userId, userId), eq(clients.id, id)))
    .returning({ companyId: clients.companyId })
  return row ?? null
}
