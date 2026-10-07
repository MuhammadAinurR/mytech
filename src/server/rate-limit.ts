import 'server-only'

import { createHash } from 'node:crypto'

import { redis } from './redis'

// Fixed window counter, atomic in one round trip.
const SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return { count, redis.call('PTTL', KEYS[1]) }
`

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number }

export type RateLimitRule = { bucket: string; limit: number; windowSeconds: number }

function keyFor(rule: RateLimitRule, identifier: string) {
  // Identifiers (emails, IPs) are hashed so Redis never stores them in clear.
  const digest = createHash('sha256').update(identifier).digest('hex').slice(0, 32)
  return `rl:${rule.bucket}:${digest}`
}

export async function rateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  const [count, ttlMs] = (await redis.eval(
    SCRIPT,
    1,
    keyFor(rule, identifier),
    String(rule.windowSeconds * 1000),
  )) as [number, number]
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
  }
}

export async function resetRateLimit(rule: RateLimitRule, identifier: string): Promise<void> {
  await redis.del(keyFor(rule, identifier))
}

export const RATE_LIMITS = {
  // Per email + IP: slows guessing against one account.
  login: { bucket: 'login', limit: 5, windowSeconds: 15 * 60 },
  // Per IP: slows spraying many accounts from one address.
  loginIp: { bucket: 'login-ip', limit: 30, windowSeconds: 15 * 60 },
  signup: { bucket: 'signup', limit: 5, windowSeconds: 60 * 60 },
  credentialReveal: { bucket: 'reveal', limit: 30, windowSeconds: 5 * 60 },
  // Per user: a test notification is a manual check, not a messaging channel.
  testPush: { bucket: 'test-push', limit: 5, windowSeconds: 10 * 60 },
} as const satisfies Record<string, RateLimitRule>
