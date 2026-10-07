import 'server-only'

import { and, desc, eq, inArray, sql } from 'drizzle-orm'

import { db } from '../db'
import { pushSubscriptions } from '../db/schema'
import { type PushOutcome, type PushTarget, sendPush } from '../push'
import type { PushMessage } from '@/features/notifications/lib/reminders'

/** Data access for push subscriptions (one per device), scoped by owner. */

export type PushSubscriptionInput = PushTarget & { label: string | null }

export type PushDevice = {
  id: string
  label: string | null
  createdAt: Date
  lastSuccessAt: Date | null
}

/**
 * Saves this device for the user. An endpoint already saved (this device, or
 * this browser under another account) is taken over, keys refreshed.
 */
export async function savePushSubscription(
  userId: string,
  input: PushSubscriptionInput,
): Promise<{ id: string }> {
  const [row] = await db
    .insert(pushSubscriptions)
    .values({ userId, ...input })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: input.p256dh, auth: input.auth, label: input.label },
    })
    .returning({ id: pushSubscriptions.id })
  return row!
}

export async function listPushDevices(userId: string): Promise<PushDevice[]> {
  return db
    .select({
      id: pushSubscriptions.id,
      label: pushSubscriptions.label,
      createdAt: pushSubscriptions.createdAt,
      lastSuccessAt: pushSubscriptions.lastSuccessAt,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .orderBy(desc(pushSubscriptions.createdAt))
}

/** The id of this device's subscription, if it belongs to the user. */
export async function findPushDevice(userId: string, endpoint: string): Promise<string | null> {
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
  return row?.id ?? null
}

export async function deletePushDevice(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.id, id)))
    .returning({ id: pushSubscriptions.id })
  return deleted.length > 0
}

export async function deletePushEndpoint(userId: string, endpoint: string): Promise<boolean> {
  const deleted = await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
    .returning({ id: pushSubscriptions.id })
  return deleted.length > 0
}

export type Delivery = { sent: number; gone: number; failed: number }

/**
 * Sends a message to every device the user has. Devices the push service
 * reports gone are removed; delivered ones get their last-success time.
 */
export async function pushToUser(
  userId: string,
  message: PushMessage,
  send: (target: PushTarget, message: PushMessage) => Promise<PushOutcome> = sendPush,
): Promise<Delivery> {
  const devices = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  const outcomes = await Promise.all(devices.map((device) => send(device, message)))
  const ids = (outcome: PushOutcome) =>
    devices.filter((_, i) => outcomes[i] === outcome).map((d) => d.id)
  const [sent, gone] = [ids('sent'), ids('gone')]

  if (gone.length > 0) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone))
  if (sent.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ lastSuccessAt: sql`now()` })
      .where(inArray(pushSubscriptions.id, sent))
  }
  return { sent: sent.length, gone: gone.length, failed: ids('failed').length }
}
