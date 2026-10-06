'use server'

import { revalidatePath } from 'next/cache'

import { err, ok, type Result } from '@/lib/result'
import { fieldErrors } from '@/lib/validation'
import { changePassword } from '@/server/auth/password-change'
import { requireUser, startSession } from '@/server/auth/session'
import { updateUserProfile } from '@/server/queries/users'

import { passwordChangeSchema, profileSchema } from './schema'

export async function updateProfileAction(input: unknown): Promise<Result<undefined, 'invalid'>> {
  const user = await requireUser()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  await updateUserProfile(user.id, parsed.data)
  revalidatePath('/', 'layout')
  return ok()
}

export async function changePasswordAction(
  input: unknown,
): Promise<Result<undefined, 'invalid' | 'wrong_password'>> {
  const user = await requireUser()
  const parsed = passwordChangeSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const result = await changePassword(user.id, parsed.data)
  if (!result.ok) {
    return err('wrong_password', { currentPassword: ['That isn’t your current password.'] })
  }
  // Every session was revoked, including this one; keep this device signed in.
  await startSession(user.id)
  return ok()
}
