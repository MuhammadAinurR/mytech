import { afterAll, describe, expect, it } from 'vitest'

import { closeDb } from './db'
import { checkHealth } from './health'
import { closeRedis } from './redis'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})

describe('checkHealth', () => {
  it('reports both dependencies as healthy', async () => {
    await expect(checkHealth()).resolves.toEqual({
      status: 'ok',
      checks: { postgres: 'ok', redis: 'ok' },
    })
  })
})
