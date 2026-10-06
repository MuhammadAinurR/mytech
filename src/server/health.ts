import 'server-only'

import { sql } from 'drizzle-orm'

import { db } from './db'
import { logger } from './logger'
import { redis } from './redis'

type CheckStatus = 'ok' | 'error'

async function check(name: string, run: () => Promise<unknown>, timeoutMs = 2000) {
  let timer: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      run(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${name} check timed out`)), timeoutMs)
      }),
    ])
    return 'ok' as CheckStatus
  } catch (error) {
    logger.error({ err: error, check: name }, 'health check failed')
    return 'error' as CheckStatus
  } finally {
    clearTimeout(timer)
  }
}

export async function checkHealth() {
  const [postgres, redisStatus] = await Promise.all([
    check('postgres', () => db.execute(sql`select 1`)),
    check('redis', () => redis.ping()),
  ])
  const healthy = postgres === 'ok' && redisStatus === 'ok'
  return { status: healthy ? 'ok' : 'degraded', checks: { postgres, redis: redisStatus } } as const
}
