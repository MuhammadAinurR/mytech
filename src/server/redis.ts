import 'server-only'

import { Redis } from 'ioredis'

import { env } from '@/env'

/** Every key this app writes starts with this prefix (BullMQ uses wb:bull). */
export const REDIS_KEY_PREFIX = 'wb:'

const globalForRedis = globalThis as unknown as { workbenchRedis?: Redis }

export const redis =
  globalForRedis.workbenchRedis ??
  new Redis(env.REDIS_URL, {
    keyPrefix: REDIS_KEY_PREFIX,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: true,
    lazyConnect: false,
  })

if (env.NODE_ENV !== 'production') globalForRedis.workbenchRedis = redis

export async function closeRedis(): Promise<void> {
  await redis.quit()
  globalForRedis.workbenchRedis = undefined
}
