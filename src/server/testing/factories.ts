import 'server-only'

import { hashPassword } from '../auth/password'
import { insertUser, type CurrentUser } from '../queries/users'

export const TEST_PASSWORD = 'correct horse battery staple'

let cachedHash: Promise<string> | undefined

/** Inserts a user with a unique email. Reuses one argon2 hash to keep tests fast. */
export async function createTestUser(
  overrides: Partial<{ email: string; name: string; timezone: string }> = {},
): Promise<CurrentUser> {
  cachedHash ??= hashPassword(TEST_PASSWORD)
  const result = await insertUser({
    email: overrides.email ?? `user-${crypto.randomUUID()}@example.test`,
    name: overrides.name ?? 'Test User',
    timezone: overrides.timezone ?? 'UTC',
    passwordHash: await cachedHash,
  })
  if (!result.ok) throw new Error(`createTestUser failed: ${result.error}`)
  return result.data
}

export function uniqueIp(): string {
  const n = () => Math.floor(Math.random() * 254) + 1
  return `10.${n()}.${n()}.${n()}`
}
