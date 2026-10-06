import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  char,
  check,
  date,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { id, timestamps } from './columns'
import { recurrenceFrequency, transactionType } from './enums'
import { users } from './users'

/**
 * A template the worker turns into transactions: monthly on a day of the month,
 * or yearly on a month and day. Days past the end of a short month clamp to
 * its last day (31 → Feb 28/29, Feb 29 → Feb 28 in common years).
 */
export const recurringRules = pgTable(
  'recurring_rules',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text().notNull(),
    type: transactionType().notNull(),
    amountMinor: bigint({ mode: 'number' }).notNull(),
    currency: char({ length: 3 }).notNull(),
    category: text().notNull(),
    note: text(),
    frequency: recurrenceFrequency().notNull(),
    dayOfMonth: smallint().notNull(),
    monthOfYear: smallint(),
    startsOn: date({ mode: 'string' }).notNull(),
    endsOn: date({ mode: 'string' }),
    isActive: boolean().notNull().default(true),
    // Optional lead time for a dashboard reminder before each occurrence.
    reminderDaysBefore: smallint(),
    // Generation cursor: every occurrence on or before this date has been created.
    generatedThrough: date({ mode: 'string' }),
    ...timestamps,
  },
  (table) => [
    index('recurring_rules_user_idx').on(table.userId, table.isActive),
    index('recurring_rules_active_idx')
      .on(table.id)
      .where(sql`${table.isActive}`),
    check('recurring_rules_label_length', sql`length(btrim(${table.label})) between 1 and 120`),
    check('recurring_rules_amount_positive', sql`${table.amountMinor} > 0`),
    check('recurring_rules_currency_format', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check(
      'recurring_rules_category_length',
      sql`length(btrim(${table.category})) between 1 and 64`,
    ),
    check('recurring_rules_day_range', sql`${table.dayOfMonth} between 1 and 31`),
    check(
      'recurring_rules_month_matches_frequency',
      sql`(${table.frequency} = 'yearly' and ${table.monthOfYear} between 1 and 12) or (${table.frequency} = 'monthly' and ${table.monthOfYear} is null)`,
    ),
    check(
      'recurring_rules_ends_after_start',
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.startsOn}`,
    ),
    check(
      'recurring_rules_reminder_range',
      sql`${table.reminderDaysBefore} is null or ${table.reminderDaysBefore} between 0 and 365`,
    ),
  ],
)

/** A dashboard reminder for one upcoming occurrence of a rule. */
export const reminders = pgTable(
  'reminders',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ruleId: uuid()
      .notNull()
      .references(() => recurringRules.id, { onDelete: 'cascade' }),
    occurrenceDate: date({ mode: 'string' }).notNull(),
    remindOn: date({ mode: 'string' }).notNull(),
    dismissedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('reminders_rule_occurrence_key').on(table.ruleId, table.occurrenceDate),
    index('reminders_user_open_idx').on(table.userId, table.dismissedAt, table.occurrenceDate),
    check('reminders_remind_before_due', sql`${table.remindOn} <= ${table.occurrenceDate}`),
  ],
)

export type RecurringRuleRow = typeof recurringRules.$inferSelect
export type ReminderRow = typeof reminders.$inferSelect
