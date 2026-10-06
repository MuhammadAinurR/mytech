import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from './password'

describe('password hashing', () => {
  it('uses argon2id with the configured cost and verifies round trips', async () => {
    const hash = await hashPassword('a long enough password')
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
    await expect(verifyPassword(hash, 'a long enough password')).resolves.toBe(true)
    await expect(verifyPassword(hash, 'a long enough passworD')).resolves.toBe(false)
  })

  it('salts every hash', async () => {
    const [a, b] = await Promise.all([hashPassword('same input'), hashPassword('same input')])
    expect(a).not.toBe(b)
  })

  it('treats malformed hashes as a failed match instead of throwing', async () => {
    await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false)
  })
})
