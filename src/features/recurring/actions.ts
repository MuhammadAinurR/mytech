'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { err, ok, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { enqueueRuleGeneration } from '@/server/queue'
import {
  createRule,
  deleteRule,
  dismissReminder,
  setRuleActive,
  updateRule,
} from '@/server/queries/recurring'

import { recurringRuleInputSchema } from './schema'

type ActionError = 'invalid' | 'not_found'

function refresh() {
  revalidatePath('/transactions', 'layout')
  revalidatePath('/dashboard')
}

export async function createRuleAction(
  input: unknown,
): Promise<Result<{ id: string }, ActionError>> {
  const user = await requireUser()
  const parsed = recurringRuleInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const rule = await createRule(user.id, parsed.data)
  await enqueueRuleGeneration(rule.id)
  refresh()
  return ok({ id: rule.id })
}

export async function updateRuleAction(
  id: unknown,
  input: unknown,
): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const ruleId = uuidSchema.safeParse(id)
  if (!ruleId.success) return err('not_found')
  const parsed = recurringRuleInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const rule = await updateRule(user.id, ruleId.data, parsed.data)
  if (!rule) return err('not_found')
  await enqueueRuleGeneration(rule.id)
  refresh()
  return ok()
}

export async function setRuleActiveAction(
  id: unknown,
  active: unknown,
): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const ruleId = uuidSchema.safeParse(id)
  const isActive = z.boolean().safeParse(active)
  if (!ruleId.success || !isActive.success) return err('not_found')

  const rule = await setRuleActive(user.id, ruleId.data, isActive.data)
  if (!rule) return err('not_found')
  if (rule.isActive) await enqueueRuleGeneration(rule.id)
  refresh()
  return ok()
}

export async function deleteRuleAction(id: unknown): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const ruleId = uuidSchema.safeParse(id)
  if (!ruleId.success) return err('not_found')

  if (!(await deleteRule(user.id, ruleId.data))) return err('not_found')
  refresh()
  return ok()
}

export async function dismissReminderAction(id: unknown): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const reminderId = uuidSchema.safeParse(id)
  if (!reminderId.success) return err('not_found')

  if (!(await dismissReminder(user.id, reminderId.data))) return err('not_found')
  revalidatePath('/dashboard')
  return ok()
}
