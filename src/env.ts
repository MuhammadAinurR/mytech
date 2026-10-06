import 'server-only'

import { z } from 'zod'

import { parseKeyring } from './server/crypto/keyring'

/**
 * Server environment, validated once at startup. Import `env` instead of reading
 * `process.env` directly so a missing or malformed variable fails fast with a
 * readable message (values are never echoed, only names and problems).
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z
      .url()
      .refine((value) => /^postgres(ql)?:\/\//.test(value), 'must be a postgres:// URL'),
    REDIS_URL: z.url().refine((value) => /^rediss?:\/\//.test(value), 'must be a redis:// URL'),
    APP_URL: z.url(),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    // Credential encryption: "1:<base64 32 bytes>,2:<…>" and the version for new writes.
    ENCRYPTION_KEYS: z.string().min(1, 'is required'),
    ENCRYPTION_KEY_VERSION: z.coerce.number().int().min(1),
  })
  .superRefine((value, ctx) => {
    try {
      parseKeyring(value.ENCRYPTION_KEYS, value.ENCRYPTION_KEY_VERSION)
    } catch (error) {
      ctx.addIssue({
        code: 'custom',
        path: ['ENCRYPTION_KEYS'],
        message: error instanceof Error ? error.message : 'is invalid',
      })
    }
  })

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${problems}`)
  }
  return result.data
}

export const env: Env = parseEnv(process.env)
