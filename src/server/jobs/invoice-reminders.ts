import 'server-only'

import { and, between, eq, exists, inArray, sql } from 'drizzle-orm'

import {
  candidateDueDates,
  localHour,
  REMINDER_HOUR,
  reminderKind,
  reminderMessage,
  type ReminderInvoice,
  type ReminderKind,
} from '@/features/notifications/lib/reminders'
import { todayInTimeZone } from '@/lib/dates'

import { db } from '../db'
import { invoiceReminderPushes, invoices, pushSubscriptions, users } from '../db/schema'
import { logger } from '../logger'
import { isPushConfigured } from '../push'
import { type Delivery, pushToUser } from '../queries/push'

type Push = typeof pushToUser

/**
 * Sends due-date reminders for sent, unpaid invoices: three days before, on
 * the day, and the day after, from 09:00 in each user's timezone (runs every
 * 15 minutes, so a late run still catches up the same day).
 *
 * Idempotent: each reminder is claimed in invoice_reminder_pushes (unique per
 * invoice, kind, and due date) before it is sent, so retries and concurrent
 * workers never send it twice. If no device accepted it, the claim is released
 * and the next run tries again. Several invoices of one kind arrive as one
 * summary notification.
 */
export async function sendInvoiceReminders({
  now = new Date(),
  push = pushToUser,
}: { now?: Date; push?: Push } = {}): Promise<{ notifications: number }> {
  if (!isPushConfigured()) return { notifications: 0 }

  const { from, to } = candidateDueDates(todayInTimeZone('UTC', now))
  const rows = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      numberLabel: invoices.numberLabel,
      clientName: invoices.clientName,
      totalMinor: invoices.totalMinor,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      timezone: users.timezone,
    })
    .from(invoices)
    .innerJoin(users, eq(users.id, invoices.userId))
    .where(
      and(
        eq(invoices.status, 'sent'),
        between(invoices.dueDate, from, to),
        // Only users with somewhere to send it.
        exists(
          db
            .select({ one: sql`1` })
            .from(pushSubscriptions)
            .where(eq(pushSubscriptions.userId, invoices.userId)),
        ),
      ),
    )

  const due = rows.flatMap(({ timezone, ...invoice }) => {
    if (localHour(now, timezone) < REMINDER_HOUR) return []
    const kind = reminderKind(todayInTimeZone(timezone, now), invoice.dueDate)
    return kind ? [{ ...invoice, kind }] : []
  })
  if (due.length === 0) return { notifications: 0 }

  const claimed = await db
    .insert(invoiceReminderPushes)
    .values(
      due.map((invoice) => ({
        userId: invoice.userId,
        invoiceId: invoice.id,
        kind: invoice.kind,
        dueDate: invoice.dueDate,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: invoiceReminderPushes.id, invoiceId: invoiceReminderPushes.invoiceId })

  // One message per user and kind.
  const groups = new Map<
    string,
    { userId: string; kind: ReminderKind; items: ReminderInvoice[]; claims: string[] }
  >()
  for (const claim of claimed) {
    const invoice = due.find((candidate) => candidate.id === claim.invoiceId)!
    const key = `${invoice.userId}:${invoice.kind}`
    const group = groups.get(key) ?? {
      userId: invoice.userId,
      kind: invoice.kind,
      items: [],
      claims: [],
    }
    group.items.push(invoice)
    group.claims.push(claim.id)
    groups.set(key, group)
  }

  let notifications = 0
  for (const group of groups.values()) {
    const items = [...group.items].sort((a, b) => a.numberLabel.localeCompare(b.numberLabel))
    const delivery: Delivery = await push(group.userId, reminderMessage(group.kind, items))
    if (delivery.sent > 0) {
      notifications++
    } else if (delivery.failed > 0) {
      // Nothing got through: let the next run try again.
      await db.delete(invoiceReminderPushes).where(inArray(invoiceReminderPushes.id, group.claims))
    }
  }
  if (notifications > 0) logger.info({ notifications }, 'sent invoice reminders')
  return { notifications }
}
