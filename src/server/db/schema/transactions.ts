import { sql } from 'drizzle-orm'
import {
  bigint,
  char,
  check,
  date,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'

import { id, timestamps } from './columns'
import { transactionType } from './enums'
import { recurringRules } from './recurring'
import { users } from './users'

export const transactions = pgTable(
  'transactions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: transactionType().notNull(),
    // Integer minor units; the sign comes from `type`, so amounts are always positive.
    amountMinor: bigint({ mode: 'number' }).notNull(),
    currency: char({ length: 3 }).notNull(),
    category: text().notNull(),
    occurredOn: date({ mode: 'string' }).notNull(),
    note: text(),
    // Set when the worker generated this entry from a recurring rule.
    recurringRuleId: uuid().references((): AnyPgColumn => recurringRules.id, {
      onDelete: 'set null',
    }),
    occurrenceDate: date({ mode: 'string' }),
    ...timestamps,
  },
  (table) => [
    // Serves the default list (newest first) and month filters.
    index('transactions_user_occurred_idx').on(
      table.userId,
      table.occurredOn.desc(),
      table.createdAt.desc(),
    ),
    index('transactions_user_type_idx').on(table.userId, table.type, table.occurredOn),
    index('transactions_user_category_idx').on(table.userId, table.category),
    check('transactions_amount_positive', sql`${table.amountMinor} > 0`),
    check('transactions_currency_format', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check('transactions_category_length', sql`length(btrim(${table.category})) between 1 and 64`),
    check('transactions_note_length', sql`${table.note} is null or length(${table.note}) <= 1000`),
    // Idempotency for the worker: one transaction per rule occurrence, ever.
    uniqueIndex('transactions_rule_occurrence_key').on(table.recurringRuleId, table.occurrenceDate),
    check(
      'transactions_rule_has_occurrence',
      sql`${table.recurringRuleId} is null or ${table.occurrenceDate} is not null`,
    ),
  ],
)

export type TransactionRow = typeof transactions.$inferSelect
export type NewTransactionRow = typeof transactions.$inferInsert
