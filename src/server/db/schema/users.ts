import { sql } from 'drizzle-orm'
import { char, check, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'

import { id, timestamps } from './columns'

export const users = pgTable(
  'users',
  {
    id: id(),
    // Stored lowercased and trimmed; the check keeps it that way.
    email: text().notNull(),
    name: text().notNull(),
    passwordHash: text().notNull(),
    // IANA timezone used to decide "today" and render dates and times.
    timezone: text().notNull().default('UTC'),
    defaultCurrency: char({ length: 3 }).notNull().default('USD'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('users_email_key').on(table.email),
    check('users_email_normalized', sql`${table.email} = lower(btrim(${table.email}))`),
    check('users_name_not_blank', sql`length(btrim(${table.name})) > 0`),
    check('users_default_currency_upper', sql`${table.defaultCurrency} ~ '^[A-Z]{3}$'`),
  ],
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
