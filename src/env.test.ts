import { describe, expect, it } from 'vitest'

import { parseEnv } from './env'

const valid = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/workbench_test',
  REDIS_URL: 'redis://localhost:6379/2',
  APP_URL: 'http://localhost:3100',
}

describe('parseEnv', () => {
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
})
