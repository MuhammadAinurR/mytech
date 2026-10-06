import { describe, expect, it } from 'vitest'

import { loginSchema, safeNextPath, signupSchema } from './schema'

describe('auth schemas', () => {
  it('normalizes email', () => {
    const parsed = loginSchema.parse({ email: '  Rofiq@Example.TEST ', password: 'x' })
    expect(parsed.email).toBe('rofiq@example.test')
  })

  it('requires a 10+ character password on signup and falls back to UTC', () => {
    const short = signupSchema.safeParse({
      name: 'A',
      email: 'a@b.co',
      password: 'short',
      timezone: 'UTC',
    })
    expect(short.success).toBe(false)
    const ok = signupSchema.parse({
      name: ' A ',
      email: 'a@b.co',
      password: '0123456789',
      timezone: 'Nowhere/City',
    })
    expect(ok).toMatchObject({ name: 'A', timezone: 'UTC' })
  })
})

describe('safeNextPath', () => {
  it.each([
    ['/transactions?page=2', '/transactions?page=2'],
    ['//evil.example', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['https://evil.example', '/dashboard'],
    ['/login', '/dashboard'],
    ['', '/dashboard'],
    [null, '/dashboard'],
  ])('%j → %j', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected)
  })
})
