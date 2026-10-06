import { pgEnum } from 'drizzle-orm/pg-core'

export const transactionType = pgEnum('transaction_type', ['income', 'expense'])
export const recurrenceFrequency = pgEnum('recurrence_frequency', ['monthly', 'yearly'])
export const credentialType = pgEnum('credential_type', ['server', 'domain', 'other'])
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'paid'])
