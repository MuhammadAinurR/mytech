import { z } from 'zod'

import { TRANSACTION_TYPES } from '@/features/transactions/schema'
import { isDateOnly } from '@/lib/dates'
import { CURRENCIES, parseMoneyInput } from '@/lib/money'
import { dateOnlySchema } from '@/lib/validation'

import { type Frequency } from './lib/recurrence'

export const FREQUENCIES = ['monthly', 'yearly'] as const satisfies readonly Frequency[]

/**
 * The rule editor's values, all strings as the inputs hold them. Shared by the
 * browser (inline validation) and the server (authoritative parse).
 */
export const recurringRuleFormSchema = z
  .object({
    label: z.string().trim().min(1, 'Name this rule.').max(120, 'Use 120 characters or fewer.'),
    type: z.enum(TRANSACTION_TYPES, 'Choose income or expense.'),
    amount: z.string().trim().min(1, 'Enter an amount.').max(32),
    currency: z.enum(CURRENCIES, 'Choose a currency.'),
    category: z.string().trim().min(1, 'Enter a category.').max(64, 'Use 64 characters or fewer.'),
    note: z.string().trim().max(1000, 'Use 1,000 characters or fewer.'),
    frequency: z.enum(FREQUENCIES, 'Choose how often.'),
    dayOfMonth: z.string().trim(),
    monthOfYear: z.string().trim(),
    startsOn: dateOnlySchema,
    endsOn: z.string().trim(),
    reminderDaysBefore: z.string().trim(),
  })
  .superRefine((value, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })

    const minor = parseMoneyInput(value.amount, value.currency)
    if (minor === null || minor <= 0) {
      issue(
        'amount',
        minor === 0
          ? 'Enter an amount greater than zero.'
          : 'Enter an amount like 1250 or 1,250.00.',
      )
    }
    if (!/^\d{1,2}$/.test(value.dayOfMonth) || +value.dayOfMonth < 1 || +value.dayOfMonth > 31) {
      issue('dayOfMonth', 'Choose a day from 1 to 31.')
    }
    if (value.frequency === 'yearly') {
      const month = Number(value.monthOfYear)
      if (!Number.isInteger(month) || month < 1 || month > 12)
        issue('monthOfYear', 'Choose a month.')
    }
    if (value.endsOn !== '') {
      if (!isDateOnly(value.endsOn)) issue('endsOn', 'Enter a valid date.')
      else if (value.endsOn < value.startsOn) issue('endsOn', 'End on or after the start date.')
    }
    if (value.reminderDaysBefore !== '') {
      const days = Number(value.reminderDaysBefore)
      if (!/^\d{1,3}$/.test(value.reminderDaysBefore) || days > 365) {
        issue('reminderDaysBefore', 'Use 0 to 365 days.')
      }
    }
  })

export type RecurringRuleFormValues = z.input<typeof recurringRuleFormSchema>

/** Server-side: editor values → the stored rule. */
export const recurringRuleInputSchema = recurringRuleFormSchema.transform((value) => ({
  label: value.label,
  type: value.type,
  amountMinor: parseMoneyInput(value.amount, value.currency)!,
  currency: value.currency,
  category: value.category,
  note: value.note === '' ? null : value.note,
  frequency: value.frequency,
  dayOfMonth: Number(value.dayOfMonth),
  monthOfYear: value.frequency === 'yearly' ? Number(value.monthOfYear) : null,
  startsOn: value.startsOn,
  endsOn: value.endsOn === '' ? null : value.endsOn,
  reminderDaysBefore: value.reminderDaysBefore === '' ? null : Number(value.reminderDaysBefore),
}))

export type RecurringRuleInput = z.output<typeof recurringRuleInputSchema>
