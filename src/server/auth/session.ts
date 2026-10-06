import 'server-only'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { env } from '@/env'
import { DEV_SESSION_COOKIE, SECURE_SESSION_COOKIE } from '@/lib/session-cookie'

import { getUserById, type CurrentUser } from '../queries/users'
import {
  createSession,
  invalidateSession,
  SESSION_TTL_SECONDS,
  validateSessionToken,
  type Session,
} from './session-store'
import { type RequestMeta } from './service'

const secure = new URL(env.APP_URL).protocol === 'https:'
export const SESSION_COOKIE = secure ? SECURE_SESSION_COOKIE : DEV_SESSION_COOKIE

export async function getRequestMeta(): Promise<RequestMeta> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return {
    ip: forwarded || h.get('x-real-ip') || 'unknown',
    userAgent: h.get('user-agent') ?? undefined,
  }
}

/** Starts a session for a user and sets the httpOnly cookie. Server actions only. */
export async function startSession(userId: string): Promise<void> {
  const { token } = await createSession(userId, await getRequestMeta())
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

/** Ends the current session in Redis and clears the cookie. Server actions only. */
export async function endSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await invalidateSession(token)
  store.delete(SESSION_COOKIE)
}

export const getCurrentSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? validateSessionToken(token) : null
})

/** The signed-in user, or null. Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getCurrentSession()
  return session ? getUserById(session.userId) : null
})

/**
 * The authorization gate for every page, server action, and route handler.
 * Redirects to /login when there is no valid session.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}
