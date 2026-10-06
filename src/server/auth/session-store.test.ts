import { afterAll, describe, expect, it } from 'vitest'

import { closeRedis, redis } from '../redis'
import {
  createSession,
  invalidateAllSessions,
  invalidateSession,
  SESSION_TTL_SECONDS,
  sessionIdFromToken,
  validateSessionToken,
} from './session-store'

afterAll(closeRedis)

const userId = () => crypto.randomUUID()

describe('session store', () => {
  it('creates a session that validates by token and stores only the token hash', async () => {
    const id = userId()
    const { token, session } = await createSession(id, { ip: '10.0.0.1', userAgent: 'test' })
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(session.id).toBe(sessionIdFromToken(token))
    expect(await redis.exists(`sess:${token}`)).toBe(0)
    expect(await redis.ttl(`sess:${session.id}`)).toBeGreaterThan(SESSION_TTL_SECONDS - 5)

    const validated = await validateSessionToken(token)
    expect(validated).toMatchObject({ userId: id, ip: '10.0.0.1' })
  })

  it('rejects unknown and malformed tokens', async () => {
    await expect(validateSessionToken('x'.repeat(43))).resolves.toBeNull()
    await expect(validateSessionToken('not a token')).resolves.toBeNull()
    await expect(validateSessionToken('')).resolves.toBeNull()
  })

  it('slides the expiry forward once half the lifetime has passed', async () => {
    const { token, session } = await createSession(userId())
    await redis.expire(`sess:${session.id}`, 60)
    await validateSessionToken(token)
    expect(await redis.ttl(`sess:${session.id}`)).toBeGreaterThan(SESSION_TTL_SECONDS - 5)
  })

  it('invalidates one session', async () => {
    const { token } = await createSession(userId())
    await invalidateSession(token)
    await expect(validateSessionToken(token)).resolves.toBeNull()
  })

  it('invalidates every session for a user without touching others', async () => {
    const id = userId()
    const a = await createSession(id)
    const b = await createSession(id)
    const other = await createSession(userId())
    await invalidateAllSessions(id)
    await expect(validateSessionToken(a.token)).resolves.toBeNull()
    await expect(validateSessionToken(b.token)).resolves.toBeNull()
    await expect(validateSessionToken(other.token)).resolves.not.toBeNull()
  })
})
