import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

const valid = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/workbench_test',
  REDIS_URL: 'redis://localhost:6379/2',
  APP_URL: 'http://localhost:3100',
  ENCRYPTION_KEYS: `1:${Buffer.alloc(32, 1).toString('base64')}`,
  ENCRYPTION_KEY_VERSION: '1',
}

describe('parseEnv', () => {
  it('validates the encryption keyring without revealing keys', () => {
    const shortKey = Buffer.alloc(16, 7).toString('base64')
    expect(() => parseEnv({ ...valid, ENCRYPTION_KEYS: `1:${shortKey}` })).toThrowError(
      /ENCRYPTION_KEYS: key version 1 must decode to 32 bytes/,
    )
    expect(() => parseEnv({ ...valid, ENCRYPTION_KEYS: `1:${shortKey}` })).toThrowError(
      expect.objectContaining({ message: expect.not.stringContaining(shortKey) }),
    )
    expect(() => parseEnv({ ...valid, ENCRYPTION_KEY_VERSION: '2' })).toThrowError(
      /no key with version 2/,
    )
  })

  it('accepts a complete configuration and applies defaults', () => {
    const env = parseEnv(valid)
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL)
    expect(env.LOG_LEVEL).toBe('info')
  })

  it('names every invalid variable', () => {
    expect(() =>
      parseEnv({ ...valid, DATABASE_URL: 'mysql://localhost/db', REDIS_URL: undefined }),
    ).toThrowError(/DATABASE_URL[\s\S]*REDIS_URL|REDIS_URL[\s\S]*DATABASE_URL/)
  })

  it('never echoes the offending value', () => {
    const secretLooking = 'postgres-but-not-a-url-hunter2'
    expect(() => parseEnv({ ...valid, DATABASE_URL: secretLooking })).toThrowError(
      expect.objectContaining({ message: expect.not.stringContaining(secretLooking) }),
    )
  })

  it('takes push settings all together, or not at all (empty counts as unset)', () => {
    const vapid = {
      VAPID_PUBLIC_KEY: 'B'.repeat(87),
      VAPID_PRIVATE_KEY: 'k'.repeat(43),
      VAPID_SUBJECT: 'mailto:ops@example.com',
    }
    expect(parseEnv({ ...valid, ...vapid })).toMatchObject(vapid)
    expect(
      parseEnv({ ...valid, VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: '' }),
    ).toMatchObject({ VAPID_PUBLIC_KEY: undefined, VAPID_SUBJECT: undefined })
    expect(() => parseEnv({ ...valid, VAPID_PUBLIC_KEY: vapid.VAPID_PUBLIC_KEY })).toThrowError(
      /set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT together/,
    )
    expect(() => parseEnv({ ...valid, ...vapid, VAPID_SUBJECT: 'ops@example.com' })).toThrowError(
      /VAPID_SUBJECT: must be a mailto: or https:\/\/ URL/,
    )
    expect(() => parseEnv({ ...valid, ...vapid, VAPID_PRIVATE_KEY: 'short' })).toThrowError(
      expect.objectContaining({ message: expect.not.stringContaining('short') }),
    )
  })
})
