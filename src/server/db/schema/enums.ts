import { pgEnum } from 'drizzle-orm/pg-core'

export const transactionType = pgEnum('transaction_type', ['income', 'expense'])
export const recurrenceFrequency = pgEnum('recurrence_frequency', ['monthly', 'yearly'])
export const credentialType = pgEnum('credential_type', ['server', 'domain', 'other'])
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'sent', 'paid'])
export const projectStatus = pgEnum('project_status', ['todo', 'ongoing', 'done'])
/** Invoice due-date reminders: three days before, on the day, and the day after. */
export const invoiceReminderKind = pgEnum('invoice_reminder_kind', ['upcoming', 'due', 'overdue'])
