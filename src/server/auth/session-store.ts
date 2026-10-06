import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import { redis } from '../redis'

/**
 * Sessions live in Redis. The browser holds a random 256-bit token; Redis is
 * keyed by its SHA-256 hash, so a Redis dump never contains usable tokens.
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days
const RENEW_WHEN_REMAINING_BELOW = SESSION_TTL_SECONDS / 2

export type SessionMeta = { userAgent?: string; ip?: string }
export type Session = {
  id: string
  userId: string
  createdAt: string
  userAgent?: string
  ip?: string
}

const sessionKey = (id: string) => `sess:${id}`
const userSessionsKey = (userId: string) => `user-sess:${userId}`

export function sessionIdFromToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<{ token: string; session: Session }> {
  const token = randomBytes(32).toString('base64url')
  const session: Session = {
    id: sessionIdFromToken(token),
    userId,
    createdAt: new Date().toISOString(),
    userAgent: meta.userAgent?.slice(0, 256),
    ip: meta.ip,
  }
  await redis
    .multi()
    .set(sessionKey(session.id), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS)
    .sadd(userSessionsKey(userId), session.id)
    .expire(userSessionsKey(userId), SESSION_TTL_SECONDS)
    .exec()
  return { token, session }
}

/** Returns the session for a token, sliding its expiry forward when it is half used. */
export async function validateSessionToken(token: string): Promise<Session | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const id = sessionIdFromToken(token)
  const [[, raw], [, ttl]] = (await redis
    .multi()
    .get(sessionKey(id))
    .ttl(sessionKey(id))
    .exec()) as [[Error | null, string | null], [Error | null, number]]
  if (!raw) return null

  const session = JSON.parse(raw) as Session
  if (ttl > 0 && ttl < RENEW_WHEN_REMAINING_BELOW) {
    await redis
      .multi()
      .expire(sessionKey(id), SESSION_TTL_SECONDS)
      .expire(userSessionsKey(session.userId), SESSION_TTL_SECONDS)
      .exec()
  }
  return session
}

export async function invalidateSession(token: string): Promise<void> {
  const id = sessionIdFromToken(token)
  const raw = await redis.get(sessionKey(id))
  const multi = redis.multi().del(sessionKey(id))
  if (raw) multi.srem(userSessionsKey((JSON.parse(raw) as Session).userId), id)
  await multi.exec()
}

/** Signs a user out everywhere (after a password change, for example). */
export async function invalidateAllSessions(userId: string): Promise<void> {
  const ids = await redis.smembers(userSessionsKey(userId))
  await redis
    .multi()
    .del(...ids.map(sessionKey), userSessionsKey(userId))
    .exec()
}
