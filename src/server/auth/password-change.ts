import 'server-only'

import { type PasswordChangeInput } from '@/features/settings/schema'
import { err, ok, type Result } from '@/lib/result'

import { logger } from '../logger'
import { getPasswordHash, setPasswordHash } from '../queries/users'
import { hashPassword, verifyPassword } from './password'
import { invalidateAllSessions } from './session-store'

/**
 * Changes a password after re-verifying the current one, then revokes every
 * existing session for the user. The caller starts a fresh session for the
 * device that made the change.
 */
export async function changePassword(
  userId: string,
  input: PasswordChangeInput,
): Promise<Result<undefined, 'wrong_password'>> {
  const currentHash = await getPasswordHash(userId)
  if (!currentHash || !(await verifyPassword(currentHash, input.currentPassword))) {
    return err('wrong_password')
  }
  await setPasswordHash(userId, await hashPassword(input.newPassword))
  await invalidateAllSessions(userId)
  logger.info({ userId }, 'password changed; all sessions revoked')
  return ok()
}
