import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { id, timestamps } from './columns'
import { invoiceReminderKind } from './enums'
import { invoices } from './invoices'
import { users } from './users'

/**
 * A browser or installed app that receives push notifications. The endpoint
 * identifies one browser profile, so it belongs to one user at a time: if
 * someone else signs in on that device and turns notifications on, it moves.
 */
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    endpoint: text().notNull(),
    // Keys the payload is encrypted with (RFC 8291), base64url.
    p256dh: text().notNull(),
    auth: text().notNull(),
    // Shown in Settings, e.g. "iPhone · Safari".
    label: text(),
    lastSuccessAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('push_subscriptions_endpoint_key').on(table.endpoint),
    index('push_subscriptions_user_idx').on(table.userId),
    check(
      'push_subscriptions_endpoint_format',
      sql`${table.endpoint} ~ '^https://' and length(${table.endpoint}) <= 2048`,
    ),
    check(
      'push_subscriptions_keys_length',
      sql`length(${table.p256dh}) between 1 and 256 and length(${table.auth}) between 1 and 256`,
    ),
    check(
      'push_subscriptions_label_length',
      sql`${table.label} is null or length(${table.label}) <= 120`,
    ),
  ],
)

/**
 * Reminders already sent. The unique key makes sending idempotent: the worker
 * claims a row before sending, so a retry or a second worker never sends the
 * same reminder twice. Keyed by due date too, so moving the due date (back to
 * draft, edit, send again) earns fresh reminders.
 */
export const invoiceReminderPushes = pgTable(
  'invoice_reminder_pushes',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    kind: invoiceReminderKind().notNull(),
    dueDate: date({ mode: 'string' }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('invoice_reminder_pushes_key').on(table.invoiceId, table.kind, table.dueDate),
    index('invoice_reminder_pushes_user_idx').on(table.userId),
  ],
)

export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect
