'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { err, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import {
  deleteInvoiceAttachment,
  moveInvoiceAttachment,
} from '@/server/queries/invoice-attachments'
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

/** A client was saved from an invoice: company pages and editors list it. */
function refreshClients() {
  revalidatePath('/companies', 'layout')
  revalidatePath('/invoices', 'layout')
}

export async function createInvoiceAction(
  input: unknown,
): Promise<
  Result<
    { id: string; numberLabel: string; savedClient: boolean },
    'invalid' | 'company_not_found' | 'number_taken'
  >
> {
  const user = await requireUser()
  const parsed = invoiceInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))
  const { saveClient, ...fields } = parsed.data

  const result = await createInvoice(user.id, fields, { saveClient })
  if (!result.ok) {
    return result.error === 'company_not_found'
      ? err('company_not_found', { companyId: ['Choose one of your companies.'] })
      : err('number_taken')
  }
  refresh(result.data.id)
  if (result.data.savedClient) refreshClients()
  return result
}

export async function updateInvoiceAction(
  id: unknown,
  input: unknown,
): Promise<Result<{ savedClient: boolean }, 'invalid' | 'not_found'>> {
  const user = await requireUser()
  const invoiceId = uuidSchema.safeParse(id)
  if (!invoiceId.success) return err('not_found')
  const parsed = invoiceInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))
  const { saveClient, ...fields } = parsed.data

  const result = await updateInvoice(user.id, invoiceId.data, fields, { saveClient })
  if (result.ok) {
    refresh(invoiceId.data)
    if (result.data.savedClient) refreshClients()
  }
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

const attachmentIdsSchema = z.object({ invoiceId: uuidSchema, attachmentId: uuidSchema })

export async function deleteInvoiceAttachmentAction(
  invoiceId: unknown,
  attachmentId: unknown,
): Promise<Result<undefined, 'not_found'>> {
  const user = await requireUser()
  const ids = attachmentIdsSchema.safeParse({ invoiceId, attachmentId })
  if (!ids.success) return err('not_found')
  const result = await deleteInvoiceAttachment(user.id, ids.data.invoiceId, ids.data.attachmentId)
  if (result.ok) revalidatePath(`/invoices/${ids.data.invoiceId}`)
  return result
}

export async function moveInvoiceAttachmentAction(
  invoiceId: unknown,
  attachmentId: unknown,
  direction: unknown,
): Promise<Result<undefined, 'not_found' | 'invalid'>> {
  const user = await requireUser()
  const ids = attachmentIdsSchema.safeParse({ invoiceId, attachmentId })
  if (!ids.success) return err('not_found')
  const to = z.enum(['up', 'down']).safeParse(direction)
  if (!to.success) return err('invalid')
  const result = await moveInvoiceAttachment(
    user.id,
    ids.data.invoiceId,
    ids.data.attachmentId,
    to.data,
  )
  if (result.ok) revalidatePath(`/invoices/${ids.data.invoiceId}`)
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
