import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { authenticate } from '@/server/auth/service'
import { createSession, validateSessionToken } from '@/server/auth/session-store'
import { closeDb } from '@/server/db'
import { getUserById } from '@/server/queries/users'
import { closeRedis } from '@/server/redis'
import { createTestUser, TEST_PASSWORD, uniqueIp } from '@/server/testing/factories'

const cookieJar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '10.1.1.1' }),
}))
vi.mock('next/navigation', () => ({
  redirect: (location: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { location })
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

const { changePasswordAction, updateProfileAction } = await import('./actions')
const { SESSION_COOKIE } = await import('@/server/auth/session')

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})

beforeEach(() => cookieJar.clear())

async function signInAs(userId: string) {
  const { token } = await createSession(userId)
  cookieJar.set(SESSION_COOKIE, token)
  return token
}

describe('updateProfileAction', () => {
  it('requires a session', async () => {
    await expect(updateProfileAction({})).rejects.toMatchObject({ location: '/login' })
  })

  it('validates and saves name, timezone, and currency for the signed-in user only', async () => {
    const user = await createTestUser()
    const other = await createTestUser()
    await signInAs(user.id)

    const invalid = await updateProfileAction({
      name: '',
      timezone: 'Mars/Base',
      defaultCurrency: 'XXX',
    })
    expect(invalid).toMatchObject({ ok: false, error: 'invalid' })
    if (!invalid.ok)
      expect(Object.keys(invalid.fieldErrors ?? {}).sort()).toEqual([
        'defaultCurrency',
        'name',
        'timezone',
      ])

    const result = await updateProfileAction({
      name: 'Rofiq',
      timezone: 'Asia/Jakarta',
      defaultCurrency: 'IDR',
    })
    expect(result).toEqual({ ok: true, data: undefined })
    await expect(getUserById(user.id)).resolves.toMatchObject({
      name: 'Rofiq',
      timezone: 'Asia/Jakarta',
      defaultCurrency: 'IDR',
    })
    await expect(getUserById(other.id)).resolves.toMatchObject({
      name: other.name,
      timezone: other.timezone,
    })
  })

  it('ignores a userId smuggled into the payload', async () => {
    const user = await createTestUser()
    const victim = await createTestUser()
    await signInAs(user.id)
    await updateProfileAction({
      id: victim.id,
      userId: victim.id,
      name: 'Hijacked',
      timezone: 'UTC',
      defaultCurrency: 'USD',
    })
    await expect(getUserById(victim.id)).resolves.toMatchObject({ name: victim.name })
  })
})

describe('changePasswordAction', () => {
  it('rejects a wrong current password', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const result = await changePasswordAction({
      currentPassword: 'not it',
      newPassword: 'a brand new passphrase',
    })
    expect(result).toMatchObject({ ok: false, error: 'wrong_password' })
  })

  it('changes the password, revokes other sessions, and keeps this device signed in', async () => {
    const user = await createTestUser()
    const thisDevice = await signInAs(user.id)
    const { token: otherDevice } = await createSession(user.id)

    const result = await changePasswordAction({
      currentPassword: TEST_PASSWORD,
      newPassword: 'a brand new passphrase',
    })
    expect(result.ok).toBe(true)

    await expect(validateSessionToken(otherDevice)).resolves.toBeNull()
    await expect(validateSessionToken(thisDevice)).resolves.toBeNull()
    const fresh = cookieJar.get(SESSION_COOKIE)
    expect(fresh).toBeDefined()
    expect(fresh).not.toBe(thisDevice)
    await expect(validateSessionToken(fresh!)).resolves.toMatchObject({ userId: user.id })

    const ip = uniqueIp()
    await expect(
      authenticate({ email: user.email, password: TEST_PASSWORD }, { ip }),
    ).resolves.toMatchObject({ ok: false })
    await expect(
      authenticate({ email: user.email, password: 'a brand new passphrase' }, { ip }),
    ).resolves.toMatchObject({ ok: true })
  })
})
