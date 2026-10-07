'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { err, ok, type Result } from '@/lib/result'
import { uuidSchema } from '@/lib/validation'
import { getRequestMeta, requireUser } from '@/server/auth/session'
import { isPushConfigured } from '@/server/push'
import {
  deletePushDevice,
  deletePushEndpoint,
  findPushDevice,
  pushToUser,
  savePushSubscription,
} from '@/server/queries/push'
import { RATE_LIMITS, rateLimit } from '@/server/rate-limit'

import { deviceLabel } from './lib/device-label'
import { pushSubscriptionSchema } from './schema'

const endpointSchema = z.url({ protocol: /^https$/ }).max(2048)

/** Saves this device's push subscription for the signed-in user. */
export async function enablePushAction(
  subscription: unknown,
): Promise<Result<undefined, 'invalid' | 'not_configured'>> {
  const user = await requireUser()
  if (!isPushConfigured()) return err('not_configured')
  const parsed = pushSubscriptionSchema.safeParse(subscription)
  if (!parsed.success) return err('invalid')
  const { userAgent } = await getRequestMeta()
  await savePushSubscription(user.id, {
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.keys.p256dh,
    auth: parsed.data.keys.auth,
    label: deviceLabel(userAgent),
  })
  revalidatePath('/settings')
  return ok()
}

/** Stops reminders on this device (also called before signing out). */
export async function disablePushAction(
  endpoint: unknown,
): Promise<Result<undefined, 'not_found'>> {
  const user = await requireUser()
  const parsed = endpointSchema.safeParse(endpoint)
  if (!parsed.success || !(await deletePushEndpoint(user.id, parsed.data))) {
    return err('not_found')
  }
  revalidatePath('/settings')
  return ok()
}

/** Removes another device from Settings' list. */
export async function removePushDeviceAction(id: unknown): Promise<Result<undefined, 'not_found'>> {
  const user = await requireUser()
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success || !(await deletePushDevice(user.id, parsed.data))) return err('not_found')
  revalidatePath('/settings')
  return ok()
}

/** This browser's saved device for the signed-in user, if any. */
export async function pushDeviceStatusAction(
  endpoint: unknown,
): Promise<Result<{ deviceId: string | null }>> {
  const user = await requireUser()
  const parsed = endpointSchema.safeParse(endpoint)
  if (!parsed.success) return ok({ deviceId: null })
  return ok({ deviceId: await findPushDevice(user.id, parsed.data) })
}

/** Sends a test notification to every device the user has turned on. */
export async function sendTestPushAction(): Promise<
  Result<{ sent: number }, 'not_configured' | 'rate_limited' | 'no_devices' | 'failed'>
> {
  const user = await requireUser()
  if (!isPushConfigured()) return err('not_configured')
  if (!(await rateLimit(RATE_LIMITS.testPush, user.id)).allowed) return err('rate_limited')
  const delivery = await pushToUser(user.id, {
    title: 'Notifications are on',
    body: 'Invoice reminders will arrive here three days before, on, and after each due date.',
    url: '/settings',
    tag: 'test',
  })
  if (delivery.sent > 0) return ok({ sent: delivery.sent })
  if (delivery.failed > 0) return err('failed')
  revalidatePath('/settings')
  return err('no_devices')
}
