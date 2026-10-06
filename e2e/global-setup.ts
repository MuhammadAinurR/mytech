import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { Redis } from 'ioredis'

import { ensureDatabase } from '../scripts/db-utils'
import { runMigrations } from '../scripts/migrate'

/** Migrate the e2e database and reset rate-limit counters from earlier runs. */
export default async function globalSetup() {
  const fileEnv = parseEnv(readFileSync('.env.test', 'utf8'))
  const databaseUrl = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL
  const redisUrl = process.env.REDIS_URL ?? fileEnv.REDIS_URL
  if (!databaseUrl || !redisUrl) throw new Error('DATABASE_URL and REDIS_URL are required for e2e')

  await ensureDatabase(databaseUrl)
  await runMigrations(databaseUrl)

  // Only ever touch the dedicated test Redis database.
  if (new URL(redisUrl).pathname !== '/2') throw new Error('e2e must use Redis DB 2')
  const redis = new Redis(redisUrl)
  try {
    const keys = await redis.keys('wb:rl:*')
    if (keys.length) await redis.del(...keys)
  } finally {
    redis.disconnect()
  }
}
