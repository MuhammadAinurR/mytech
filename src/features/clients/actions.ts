'use server'

import { revalidatePath } from 'next/cache'

import { err, ok, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { createClient, deleteClient, updateClient } from '@/server/queries/clients'

import { CLIENT_NAME_TAKEN, clientInputSchema } from './schema'

/** Company pages list clients and counts; invoice editors offer them. */
function refresh(companyId: string) {
  revalidatePath('/companies')
  revalidatePath(`/companies/${companyId}`)
  revalidatePath('/invoices', 'layout')
}

export async function createClientAction(
  companyId: unknown,
  input: unknown,
): Promise<Result<{ id: string }, 'invalid' | 'company_not_found'>> {
  const user = await requireUser()
  const company = uuidSchema.safeParse(companyId)
  if (!company.success) return err('company_not_found')
  const parsed = clientInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const result = await createClient(user.id, company.data, parsed.data)
  if (!result.ok) {
    return result.error === 'name_taken'
      ? err('invalid', { name: [CLIENT_NAME_TAKEN] })
      : err('company_not_found')
  }
  refresh(company.data)
  return ok({ id: result.data.id })
}

export async function updateClientAction(
  id: unknown,
  input: unknown,
): Promise<Result<undefined, 'invalid' | 'not_found'>> {
  const user = await requireUser()
  const clientId = uuidSchema.safeParse(id)
  if (!clientId.success) return err('not_found')
  const parsed = clientInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const result = await updateClient(user.id, clientId.data, parsed.data)
  if (!result.ok) {
    return result.error === 'name_taken'
      ? err('invalid', { name: [CLIENT_NAME_TAKEN] })
      : err('not_found')
  }
  refresh(result.data.companyId)
  return ok()
}

export async function deleteClientAction(id: unknown): Promise<Result<undefined, 'not_found'>> {
  const user = await requireUser()
  const clientId = uuidSchema.safeParse(id)
  if (!clientId.success) return err('not_found')
  const deleted = await deleteClient(user.id, clientId.data)
  if (!deleted) return err('not_found')
  refresh(deleted.companyId)
  return ok()
}
