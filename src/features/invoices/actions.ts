'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { err, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import {
  createInvoice,
  deleteInvoice,
  setInvoiceStatus,
  updateInvoice,
} from '@/server/queries/invoices'

import { INVOICE_STATUSES, invoiceInputSchema } from './schema'

function refresh(id?: string) {
  revalidatePath('/invoices')
  if (id) revalidatePath(`/invoices/${id}`)
  revalidatePath('/companies')
  revalidatePath('/dashboard')
}

export async function createInvoiceAction(
  input: unknown,
): Promise<
  Result<{ id: string; numberLabel: string }, 'invalid' | 'company_not_found' | 'number_taken'>
> {
  const user = await requireUser()
  const parsed = invoiceInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const result = await createInvoice(user.id, parsed.data)
  if (!result.ok) {
    return result.error === 'company_not_found'
      ? err('company_not_found', { companyId: ['Choose one of your companies.'] })
      : err('number_taken')
  }
  refresh(result.data.id)
  return result
}

export async function updateInvoiceAction(
  id: unknown,
  input: unknown,
): Promise<Result<undefined, 'invalid' | 'not_found' | 'not_editable'>> {
  const user = await requireUser()
  const invoiceId = uuidSchema.safeParse(id)
  if (!invoiceId.success) return err('not_found')
  const parsed = invoiceInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const result = await updateInvoice(user.id, invoiceId.data, parsed.data)
  if (result.ok) refresh(invoiceId.data)
  return result
}

export async function setInvoiceStatusAction(
  id: unknown,
  status: unknown,
): Promise<Result<undefined, 'not_found' | 'invalid_transition'>> {
  const user = await requireUser()
  const invoiceId = uuidSchema.safeParse(id)
  const next = z.enum(INVOICE_STATUSES).safeParse(status)
  if (!invoiceId.success) return err('not_found')
  if (!next.success) return err('invalid_transition')

  const result = await setInvoiceStatus(user.id, invoiceId.data, next.data)
  if (result.ok) refresh(invoiceId.data)
  return result
}

export async function deleteInvoiceAction(
  id: unknown,
): Promise<Result<undefined, 'not_found' | 'not_editable'>> {
  const user = await requireUser()
  const invoiceId = uuidSchema.safeParse(id)
  if (!invoiceId.success) return err('not_found')
  const result = await deleteInvoice(user.id, invoiceId.data)
  if (result.ok) refresh()
  return result
}
