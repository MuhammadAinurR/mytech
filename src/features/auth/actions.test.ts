import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDb } from '@/server/db'
import { closeRedis } from '@/server/redis'
import { createTestUser, TEST_PASSWORD, uniqueIp } from '@/server/testing/factories'
import { request, resetRequest } from '@/server/testing/next-request'

const { loginAction, logoutAction, signupAction } = await import('./actions')
const { getCurrentUser } = await import('@/server/auth/session')

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})

beforeEach(() => resetRequest(uniqueIp()))
const cookieJar = request.cookies

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

describe('loginAction', () => {
  it('returns field errors without touching the session for invalid input', async () => {
    const state = await loginAction(undefined, form({ email: 'not-an-email', password: '' }))
    expect(state?.fieldErrors?.email?.[0]).toMatch(/valid email/)
    expect(state?.fieldErrors?.password?.[0]).toMatch(/password/)
    expect(cookieJar.size).toBe(0)
  })

  it('sets an httpOnly SameSite cookie and redirects to a safe destination', async () => {
    const user = await createTestUser()
    await expect(
      loginAction(
        undefined,
        form({ email: user.email, password: TEST_PASSWORD, next: '//evil.example' }),
      ),
    ).rejects.toMatchObject({ location: '/dashboard' })

    const [[, cookie]] = [...cookieJar.entries()] as [
      [string, { value: string; options: Record<string, unknown> }],
    ]
    expect(cookie.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    await expect(getCurrentUser()).resolves.toMatchObject({ id: user.id })
  })

  it('uses one generic message for wrong credentials', async () => {
    const user = await createTestUser()
    const state = await loginAction(
      undefined,
      form({ email: user.email, password: 'wrong password' }),
    )
    expect(state?.error).toBe('That email and password don’t match.')
    expect(state?.values?.email).toBe(user.email)
  })
})

describe('signupAction', () => {
  it('creates the account, signs in, and lands on the dashboard', async () => {
    const email = `new-${crypto.randomUUID()}@example.test`
    await expect(
      signupAction(
        undefined,
        form({ name: 'Rofiq', email, password: 'long enough password', timezone: 'Asia/Jakarta' }),
      ),
    ).rejects.toMatchObject({ location: '/dashboard' })
    await expect(getCurrentUser()).resolves.toMatchObject({ email, timezone: 'Asia/Jakarta' })
  })

  it('reports a taken email on the email field', async () => {
    const user = await createTestUser()
    const state = await signupAction(
      undefined,
      form({
        name: 'Someone',
        email: user.email,
        password: 'long enough password',
        timezone: 'UTC',
      }),
    )
    expect(state?.fieldErrors?.email).toEqual(['An account with this email already exists.'])
  })
})

describe('logoutAction', () => {
  it('ends the session and clears the cookie', async () => {
    const user = await createTestUser()
    await loginAction(undefined, form({ email: user.email, password: TEST_PASSWORD })).catch(
      () => {},
    )
    const token = [...cookieJar.values()][0]!.value
    await expect(logoutAction()).rejects.toMatchObject({ location: '/login' })
    expect(cookieJar.size).toBe(0)
    const { validateSessionToken } = await import('@/server/auth/session-store')
    await expect(validateSessionToken(token)).resolves.toBeNull()
  })
})
