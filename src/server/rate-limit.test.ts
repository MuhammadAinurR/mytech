import { afterAll, describe, expect, it } from 'vitest'

import { rateLimit, resetRateLimit } from './rate-limit'
import { closeRedis, redis } from './redis'

afterAll(closeRedis)

const rule = { bucket: 'test', limit: 3, windowSeconds: 60 }

describe('rateLimit', () => {
  it('allows up to the limit within a window, then blocks', async () => {
    const id = crypto.randomUUID()
    const results = []
    for (let i = 0; i < 4; i++) results.push(await rateLimit(rule, id))
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
    expect(results[2]?.remaining).toBe(0)
    expect(results[3]?.retryAfterSeconds).toBeGreaterThan(0)
    expect(results[3]?.retryAfterSeconds).toBeLessThanOrEqual(60)
  })

  it('tracks identifiers independently and can be reset', async () => {
    const a = crypto.randomUUID()
    const b = crypto.randomUUID()
    for (let i = 0; i < 3; i++) await rateLimit(rule, a)
    expect((await rateLimit(rule, b)).allowed).toBe(true)
    await resetRateLimit(rule, a)
    expect((await rateLimit(rule, a)).allowed).toBe(true)
  })

  it('never stores identifiers in clear text', async () => {
    const email = `someone-${crypto.randomUUID()}@example.test`
    await rateLimit(rule, email)
    const keys = await redis.keys(`wb:rl:test:*`)
    expect(keys.join(' ')).not.toContain(email)
  })
})
