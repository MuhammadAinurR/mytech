import { z } from 'zod'

const base64url = z
  .string()
  .regex(/^[A-Za-z0-9_-]+={0,2}$/)
  .min(1)
  .max(256)

/** PushSubscription.toJSON() from the browser. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2048),
  keys: z.object({ p256dh: base64url, auth: base64url }),
})

export type PushSubscriptionJSON = z.infer<typeof pushSubscriptionSchema>
