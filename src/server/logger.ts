import 'server-only'

import pino, { type Logger } from 'pino'

import { env } from '@/env'

/**
 * Paths that must never reach a log line. Matching is by key name at the top
 * level and one level deep; deeper structures should not carry these fields.
 */
export const REDACTED_KEYS = [
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'secret',
  'ciphertext',
  'token',
  'sessionToken',
  'cookie',
  'authorization',
  'encryptionKey',
] as const

const redactPaths = REDACTED_KEYS.flatMap((key) => [key, `*.${key}`]).concat([
  'req.headers.cookie',
  'req.headers.authorization',
  'headers.cookie',
  'headers.authorization',
])

export function createLogger(destination?: pino.DestinationStream): Logger {
  return pino(
    {
      level: env.LOG_LEVEL,
      base: { app: 'workbench' },
      redact: { paths: redactPaths, censor: '[redacted]' },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: { level: (label) => ({ level: label }) },
    },
    destination,
  )
}

export const logger = createLogger()
