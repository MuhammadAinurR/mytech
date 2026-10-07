import 'server-only'

import { z } from 'zod'

import { parseKeyring } from './server/crypto/keyring'

/** An optional variable; left empty (as in .env.example) counts as unset. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional())

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
    // Web Push (VAPID). All three or none; without them push is off.
    VAPID_PUBLIC_KEY: optional(
      z.string().regex(/^[A-Za-z0-9_-]{87}$/, 'must be a base64url P-256 public key'),
    ),
    VAPID_PRIVATE_KEY: optional(
      z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'must be a base64url P-256 private key'),
    ),
    VAPID_SUBJECT: optional(
      z.string().regex(/^(mailto:|https:\/\/)/, 'must be a mailto: or https:// URL'),
    ),
  })
  .superRefine((value, ctx) => {
    const vapid = [value.VAPID_PUBLIC_KEY, value.VAPID_PRIVATE_KEY, value.VAPID_SUBJECT]
    if (vapid.some(Boolean) && !vapid.every(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['VAPID_PUBLIC_KEY'],
        message: 'set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT together',
      })
    }
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
