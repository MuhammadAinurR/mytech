import { afterAll, describe, expect, it } from 'vitest'

import { closeDb } from '../db'
import { closeRedis } from '../redis'
import { createTestUser, TEST_PASSWORD, uniqueIp } from '../testing/factories'
import { authenticate, registerUser } from './service'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})

const email = () => `person-${crypto.randomUUID()}@example.test`

describe('registerUser', () => {
  it('creates a user with a hashed password and reports duplicate emails', async () => {
    const input = {
      name: 'Rofiq',
      email: email(),
      password: 'a sufficiently long one',
      timezone: 'Asia/Jakarta',
    }
    const created = await registerUser(input, { ip: uniqueIp() })
    expect(created).toMatchObject({
      ok: true,
      data: { email: input.email, timezone: 'Asia/Jakarta' },
    })
    expect(JSON.stringify(created)).not.toContain(input.password)

    const duplicate = await registerUser(input, { ip: uniqueIp() })
    expect(duplicate).toEqual({ ok: false, error: 'email_taken' })
  })
})

describe('authenticate', () => {
  it('signs in with the right password', async () => {
    const user = await createTestUser()
    const result = await authenticate(
      { email: user.email, password: TEST_PASSWORD },
      { ip: uniqueIp() },
    )
    expect(result).toEqual({ ok: true, data: user })
  })

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const user = await createTestUser()
    const wrong = await authenticate({ email: user.email, password: 'nope' }, { ip: uniqueIp() })
    const unknown = await authenticate(
      { email: email(), password: TEST_PASSWORD },
      { ip: uniqueIp() },
    )
    expect(wrong).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(unknown).toEqual({ ok: false, error: 'invalid_credentials' })
  })

  it('locks an account+IP pair after five failures, even for the right password', async () => {
    const user = await createTestUser()
    const ip = uniqueIp()
    for (let i = 0; i < 5; i++) {
      await authenticate({ email: user.email, password: 'wrong' }, { ip })
    }
    const result = await authenticate({ email: user.email, password: TEST_PASSWORD }, { ip })
    expect(result).toEqual({ ok: false, error: 'rate_limited' })

    // A different address is not affected by the per-account limit.
    const elsewhere = await authenticate(
      { email: user.email, password: TEST_PASSWORD },
      { ip: uniqueIp() },
    )
    expect(elsewhere.ok).toBe(true)
  })
})
