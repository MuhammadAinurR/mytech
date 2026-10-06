import 'server-only'

import { type LoginInput, type SignupInput } from '@/features/auth/schema'
import { err, ok, type Result } from '@/lib/result'

import { logger } from '../logger'
import { findUserForLogin, insertUser, type CurrentUser } from '../queries/users'
import { RATE_LIMITS, rateLimit, resetRateLimit } from '../rate-limit'
import { getDummyHash, hashPassword, verifyPassword } from './password'

export type RequestMeta = { ip: string; userAgent?: string }

export async function registerUser(
  input: SignupInput,
  meta: RequestMeta,
): Promise<Result<CurrentUser, 'email_taken' | 'rate_limited'>> {
  const limit = await rateLimit(RATE_LIMITS.signup, meta.ip)
  if (!limit.allowed) return err('rate_limited')

  const passwordHash = await hashPassword(input.password)
  const result = await insertUser({
    email: input.email,
    name: input.name,
    passwordHash,
    timezone: input.timezone,
  })
  if (result.ok) logger.info({ userId: result.data.id }, 'user registered')
  return result
}

export async function authenticate(
  input: LoginInput,
  meta: RequestMeta,
): Promise<Result<CurrentUser, 'invalid_credentials' | 'rate_limited'>> {
  const accountKey = `${input.email}|${meta.ip}`
  const [perAccount, perIp] = await Promise.all([
    rateLimit(RATE_LIMITS.login, accountKey),
    rateLimit(RATE_LIMITS.loginIp, meta.ip),
  ])
  if (!perAccount.allowed || !perIp.allowed) {
    logger.warn({ ip: meta.ip }, 'login rate limited')
    return err('rate_limited')
  }

  const found = await findUserForLogin(input.email)
  // Always run one argon2 verification so timing doesn't reveal unknown emails.
  const valid = await verifyPassword(found?.passwordHash ?? (await getDummyHash()), input.password)
  if (!found || !valid) return err('invalid_credentials')

  await resetRateLimit(RATE_LIMITS.login, accountKey)
  logger.info({ userId: found.user.id }, 'user signed in')
  return ok(found.user)
}
