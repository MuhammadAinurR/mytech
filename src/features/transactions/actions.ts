'use server'

import { revalidatePath } from 'next/cache'

import { err, ok, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '@/server/queries/transactions'

import { transactionInputSchema } from './schema'

type ActionError = 'invalid' | 'not_found'

function refresh() {
  revalidatePath('/transactions')
  revalidatePath('/dashboard')
}

export async function createTransactionAction(
  input: unknown,
): Promise<Result<{ id: string }, ActionError>> {
  const user = await requireUser()
  const parsed = transactionInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const created = await createTransaction(user.id, parsed.data)
  refresh()
  return ok({ id: created.id })
}

export async function updateTransactionAction(
  id: unknown,
  input: unknown,
): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return err('not_found')
  const parsed = transactionInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const updated = await updateTransaction(user.id, parsedId.data, parsed.data)
  if (!updated) return err('not_found')
  refresh()
  return ok()
}

export async function deleteTransactionAction(
  id: unknown,
): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const parsedId = uuidSchema.safeParse(id)
  if (!parsedId.success) return err('not_found')

  const deleted = await deleteTransaction(user.id, parsedId.data)
  if (!deleted) return err('not_found')
  refresh()
  return ok()
}
