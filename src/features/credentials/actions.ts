'use server'

import { revalidatePath } from 'next/cache'

import { err, ok, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { getRequestMeta, requireUser } from '@/server/auth/session'
import { logger } from '@/server/logger'
import {
  createCredential,
  deleteCredential,
  revealSecret,
  updateCredential,
} from '@/server/queries/credentials'
import { RATE_LIMITS, rateLimit } from '@/server/rate-limit'

import {
  credentialCreateSchema,
  credentialUpdateSchema,
  revealPurposeSchema,
  toCredentialInput,
} from './schema'

type ActionError = 'invalid' | 'not_found'

export async function createCredentialAction(
  input: unknown,
): Promise<Result<{ id: string }, ActionError>> {
  const user = await requireUser()
  const parsed = credentialCreateSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const created = await createCredential(user.id, {
    ...toCredentialInput(parsed.data),
    secret: parsed.data.secret,
  })
  revalidatePath('/credentials')
  return ok({ id: created.id })
}

export async function updateCredentialAction(
  id: unknown,
  input: unknown,
): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const credentialId = uuidSchema.safeParse(id)
  if (!credentialId.success) return err('not_found')
  const parsed = credentialUpdateSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))

  const updated = await updateCredential(user.id, credentialId.data, toCredentialInput(parsed.data))
  if (!updated) return err('not_found')
  revalidatePath('/credentials')
  return ok()
}

export async function deleteCredentialAction(id: unknown): Promise<Result<undefined, ActionError>> {
  const user = await requireUser()
  const credentialId = uuidSchema.safeParse(id)
  if (!credentialId.success) return err('not_found')

  if (!(await deleteCredential(user.id, credentialId.data))) return err('not_found')
  revalidatePath('/credentials')
  return ok()
}

/**
 * The only way a secret leaves the server: one credential at a time, for its
 * owner, rate limited, and recorded in the audit log in the same transaction.
 */
export async function revealSecretAction(
  id: unknown,
  purpose: unknown = 'reveal',
): Promise<Result<{ secret: string }, 'not_found' | 'rate_limited' | 'unavailable'>> {
  const user = await requireUser()
  const credentialId = uuidSchema.safeParse(id)
  const reason = revealPurposeSchema.safeParse(purpose)
  if (!credentialId.success || !reason.success) return err('not_found')

  const limit = await rateLimit(RATE_LIMITS.credentialReveal, user.id)
  if (!limit.allowed) {
    logger.warn({ userId: user.id }, 'secret reveal rate limited')
    return err('rate_limited')
  }

  const meta = await getRequestMeta()
  try {
    const secret = await revealSecret(user.id, credentialId.data, {
      action: reason.data === 'copy' ? 'credential.copy' : 'credential.reveal',
      ip: meta.ip,
      userAgent: meta.userAgent,
    })
    if (secret === null) return err('not_found')
    logger.info(
      { userId: user.id, credentialId: credentialId.data, purpose: reason.data },
      'secret revealed',
    )
    return ok({ secret })
  } catch (error) {
    logger.error({ err: error, credentialId: credentialId.data }, 'secret could not be decrypted')
    return err('unavailable')
  }
}
