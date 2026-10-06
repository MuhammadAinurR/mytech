import { Writable } from 'node:stream'

import { describe, expect, it } from 'vitest'

import { createLogger } from './logger'

function capture() {
  const lines: string[] = []
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk))
      callback()
    },
  })
  return { logger: createLogger(stream), lines }
}

describe('logger', () => {
  it('redacts sensitive fields at the top level and one level deep', () => {
    const { logger, lines } = capture()
    logger.warn(
      {
        password: 'hunter2',
        secret: 's3cr3t',
        credential: { secret: 'nested-secret', label: 'Production DB' },
        headers: { cookie: 'wb_session=abc' },
        email: 'rofiq@example.test',
      },
      'login failed',
    )
    const output = lines.join('')
    expect(output).not.toContain('hunter2')
    expect(output).not.toContain('s3cr3t')
    expect(output).not.toContain('nested-secret')
    expect(output).not.toContain('wb_session=abc')
    expect(output).toContain('Production DB')
    expect(output).toContain('[redacted]')
  })
})
