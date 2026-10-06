import { z } from 'zod'

import { isValidTimeZone } from '@/lib/dates'

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email.')
  .max(254, 'That email address is too long.')
  .pipe(z.email('Enter a valid email address.'))

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'Use 128 characters or fewer.')

export const timezoneSchema = z.string().refine(isValidTimeZone, 'Choose a valid timezone.')

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
  email: emailSchema,
  password: passwordSchema,
  timezone: timezoneSchema.catch('UTC'),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.').max(128),
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>

/**
 * Only same-site relative paths are allowed as a post-login destination, so
 * `?next=` can't be used as an open redirect.
 */
export function safeNextPath(value: unknown, fallback = '/dashboard'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (value.startsWith('/login') || value.startsWith('/signup')) return fallback
  return value
}
