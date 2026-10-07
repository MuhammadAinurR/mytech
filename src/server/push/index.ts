import 'server-only'

import webpush, { WebPushError } from 'web-push'

import { env } from '@/env'
import type { PushMessage } from '@/features/notifications/lib/reminders'

import { logger } from '../logger'

/** Whether VAPID keys are configured; without them push is off everywhere. */
export function isPushConfigured(): boolean {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT)
}

/** The application server key browsers subscribe with. Public by design. */
export function vapidPublicKey(): string | null {
  return isPushConfigured() ? env.VAPID_PUBLIC_KEY! : null
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string }

/**
 * - sent: the push service accepted it.
 * - gone: the subscription no longer exists (404/410); delete it.
 * - failed: anything else (network, 5xx, 429); worth retrying later.
 */
export type PushOutcome = 'sent' | 'gone' | 'failed'

/** Sends one notification. Never throws; the caller acts on the outcome. */
export async function sendPush(target: PushTarget, message: PushMessage): Promise<PushOutcome> {
  if (!isPushConfigured()) return 'failed'
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(message),
      {
        vapidDetails: {
          subject: env.VAPID_SUBJECT!,
          publicKey: env.VAPID_PUBLIC_KEY!,
          privateKey: env.VAPID_PRIVATE_KEY!,
        },
        // A reminder older than a day is noise; the next one will come.
        TTL: 24 * 60 * 60,
        urgency: 'normal',
      },
    )
    return 'sent'
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      return 'gone'
    }
    // The endpoint is a capability URL; log only its host.
    logger.warn(
      {
        host: new URL(target.endpoint).host,
        status: error instanceof WebPushError ? error.statusCode : undefined,
      },
      'push send failed',
    )
    return 'failed'
  }
}
