import { z } from 'zod'

import { passwordSchema, timezoneSchema } from '@/features/auth/schema'
import { CURRENCIES } from '@/lib/money'

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Use 80 characters or fewer.'),
  timezone: timezoneSchema,
  defaultCurrency: z.enum(CURRENCIES, 'Choose a currency.'),
})

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(128),
    newPassword: passwordSchema,
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password you haven’t used here.',
  })

export type ProfileInput = z.infer<typeof profileSchema>
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>
