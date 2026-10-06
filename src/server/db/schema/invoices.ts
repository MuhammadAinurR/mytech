import { sql } from 'drizzle-orm'
import {
  bigint,
  char,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { bytea, id, timestamps } from './columns'
import { invoiceStatus } from './enums'
import { users } from './users'

/** A business the user issues invoices from. Numbering is per company. */
export const companies = pgTable(
  'companies',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    address: text(),
    taxId: text(),
    email: text(),
    defaultCurrency: char({ length: 3 }).notNull(),
    // Printed on invoices: bank account, payment link, terms of payment.
    paymentDetails: text(),
    invoicePrefix: text().notNull().default('INV-'),
    // The number the next invoice from this company will receive.
    nextInvoiceNumber: integer().notNull().default(1),
    logo: bytea(),
    logoMime: text(),
    logoUpdatedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('companies_user_name_idx').on(table.userId, table.name),
    check('companies_name_length', sql`length(btrim(${table.name})) between 1 and 160`),
    check(
      'companies_address_length',
      sql`${table.address} is null or length(${table.address}) <= 1000`,
    ),
    check('companies_tax_id_length', sql`${table.taxId} is null or length(${table.taxId}) <= 64`),
    check('companies_email_length', sql`${table.email} is null or length(${table.email}) <= 254`),
    check('companies_currency_format', sql`${table.defaultCurrency} ~ '^[A-Z]{3}$'`),
    check(
      'companies_payment_details_length',
      sql`${table.paymentDetails} is null or length(${table.paymentDetails}) <= 1000`,
    ),
    check(
      'companies_invoice_prefix_format',
      sql`${table.invoicePrefix} ~ '^[A-Za-z0-9/_-]{0,12}$'`,
    ),
    check('companies_next_number_positive', sql`${table.nextInvoiceNumber} >= 1`),
    check(
      'companies_logo_complete',
      // Explicit IS NOT NULL: `NULL in (…)` is NULL, which a CHECK would let through.
      sql`(${table.logo} is null and ${table.logoMime} is null) or (${table.logo} is not null and ${table.logoMime} is not null and ${table.logoMime} in ('image/png', 'image/jpeg', 'image/webp'))`,
    ),
    check(
      'companies_logo_size',
      sql`${table.logo} is null or octet_length(${table.logo}) <= 524288`,
    ),
  ],
)

export const invoices = pgTable(
  'invoices',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Restrict: a company with invoices can't be deleted out from under them.
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),
    number: integer().notNull(),
    // Formatted at creation (prefix + padded number) so it never changes later.
    numberLabel: text().notNull(),
    status: invoiceStatus().notNull().default('draft'),
    issueDate: date({ mode: 'string' }).notNull(),
    dueDate: date({ mode: 'string' }).notNull(),
    currency: char({ length: 3 }).notNull(),
    clientName: text().notNull(),
    clientAddress: text(),
    clientEmail: text(),
    clientTaxId: text(),
    notes: text(),
    // Tax in basis points: 1100 = 11%.
    taxRateBps: integer().notNull().default(0),
    discountMinor: bigint({ mode: 'number' }).notNull().default(0),
    subtotalMinor: bigint({ mode: 'number' }).notNull(),
    taxMinor: bigint({ mode: 'number' }).notNull(),
    totalMinor: bigint({ mode: 'number' }).notNull(),
    sentAt: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('invoices_company_number_key').on(table.companyId, table.number),
    index('invoices_user_issue_idx').on(table.userId, table.issueDate.desc(), table.number.desc()),
    index('invoices_user_status_idx').on(table.userId, table.status, table.dueDate),
    index('invoices_company_idx').on(table.companyId),
    check('invoices_number_positive', sql`${table.number} >= 1`),
    check('invoices_due_after_issue', sql`${table.dueDate} >= ${table.issueDate}`),
    check('invoices_currency_format', sql`${table.currency} ~ '^[A-Z]{3}$'`),
    check('invoices_client_name_length', sql`length(btrim(${table.clientName})) between 1 and 160`),
    check('invoices_notes_length', sql`${table.notes} is null or length(${table.notes}) <= 2000`),
    check('invoices_tax_rate_range', sql`${table.taxRateBps} between 0 and 10000`),
    check(
      'invoices_amounts_valid',
      sql`${table.subtotalMinor} >= 0 and ${table.discountMinor} >= 0 and ${table.discountMinor} <= ${table.subtotalMinor} and ${table.taxMinor} >= 0`,
    ),
    check(
      'invoices_total_consistent',
      sql`${table.totalMinor} = ${table.subtotalMinor} - ${table.discountMinor} + ${table.taxMinor}`,
    ),
    check(
      'invoices_status_timestamps',
      sql`(${table.status} = 'draft' and ${table.sentAt} is null and ${table.paidAt} is null) or (${table.status} = 'sent' and ${table.sentAt} is not null and ${table.paidAt} is null) or (${table.status} = 'paid' and ${table.sentAt} is not null and ${table.paidAt} is not null)`,
    ),
  ],
)

export const invoiceItems = pgTable(
  'invoice_items',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    invoiceId: uuid()
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    position: smallint().notNull(),
    description: text().notNull(),
    // Quantity in thousandths (1.5 hours = 1500) so it stays an integer.
    quantityMilli: integer().notNull(),
    unitPriceMinor: bigint({ mode: 'number' }).notNull(),
    lineTotalMinor: bigint({ mode: 'number' }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('invoice_items_invoice_position_key').on(table.invoiceId, table.position),
    index('invoice_items_user_idx').on(table.userId),
    check('invoice_items_position_range', sql`${table.position} between 0 and 199`),
    check(
      'invoice_items_description_length',
      sql`length(btrim(${table.description})) between 1 and 500`,
    ),
    check('invoice_items_quantity_positive', sql`${table.quantityMilli} > 0`),
    check('invoice_items_price_non_negative', sql`${table.unitPriceMinor} >= 0`),
    check('invoice_items_total_non_negative', sql`${table.lineTotalMinor} >= 0`),
  ],
)

export type CompanyRow = typeof companies.$inferSelect
export type InvoiceRow = typeof invoices.$inferSelect
export type InvoiceItemRow = typeof invoiceItems.$inferSelect
