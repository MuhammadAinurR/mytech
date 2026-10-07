import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { id, timestamps } from './columns'
import { companies } from './invoices'
import { users } from './users'

/**
 * A client the user bills regularly from one company. The invoice editor
 * fills its "Bill to" fields from here; invoices keep their own copy, so
 * editing or deleting a client never changes an existing invoice.
 */
export const clients = pgTable(
  'clients',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Saved clients belong to one company and go with it.
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    address: text(),
    email: text(),
    taxId: text(),
    ...timestamps,
  },
  (table) => [
    // One entry per name within a company, ignoring case. Also serves the
    // company's alphabetical list.
    uniqueIndex('clients_company_name_key').on(table.companyId, sql`lower(${table.name})`),
    index('clients_user_idx').on(table.userId),
    check('clients_name_length', sql`length(btrim(${table.name})) between 1 and 160`),
    check(
      'clients_address_length',
      sql`${table.address} is null or length(${table.address}) <= 1000`,
    ),
    check('clients_email_length', sql`${table.email} is null or length(${table.email}) <= 254`),
    check('clients_tax_id_length', sql`${table.taxId} is null or length(${table.taxId}) <= 64`),
  ],
)

export type ClientRow = typeof clients.$inferSelect
