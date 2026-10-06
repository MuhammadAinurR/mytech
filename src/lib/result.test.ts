import { describe, expect, it } from 'vitest'

import { err, ok } from './result'

describe('result helpers', () => {
  it('builds success and failure values', () => {
    expect(ok()).toEqual({ ok: true, data: undefined })
    expect(ok(42)).toEqual({ ok: true, data: 42 })
    expect(err('not_found')).toEqual({ ok: false, error: 'not_found' })
    expect(err('invalid', { email: ['Required'] })).toEqual({
      ok: false,
      error: 'invalid',
      fieldErrors: { email: ['Required'] },
    })
  })
})
