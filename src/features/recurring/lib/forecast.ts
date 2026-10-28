import { type TransactionType } from '@/features/transactions/schema'
import { addDays, type DateOnly } from '@/lib/dates'
import { monthOf } from '@/lib/months'

import { occurrencesBetween, type Frequency, type RecurrenceSpec } from './recurrence'

export type ScheduledRule = RecurrenceSpec & {
  id: string
  label: string
  type: TransactionType
  amountMinor: number
  currency: string
  /** The worker's cursor: every occurrence on or before it is already a transaction. */
  generatedThrough: DateOnly | null
}

export type ScheduledEntry = {
  ruleId: string
  label: string
  type: TransactionType
  amountMinor: number
  currency: string
  frequency: Frequency
  date: DateOnly
}

/**
 * What active rules will still add to the ledger from `today` through `until`,
 * soonest first. An occurrence the worker already created is real money in the
 * ledger, so it starts after the cursor and is never counted twice.
 */
export function scheduledEntries(
  rules: ScheduledRule[],
  today: DateOnly,
  until: DateOnly,
): ScheduledEntry[] {
  return rules
    .flatMap((rule) => {
      const afterCursor = rule.generatedThrough ? addDays(rule.generatedThrough, 1) : today
      const from = afterCursor > today ? afterCursor : today
      return occurrencesBetween(rule, from, until).map((date) => ({
        ruleId: rule.id,
        label: rule.label,
        type: rule.type,
        amountMinor: rule.amountMinor,
        currency: rule.currency,
        frequency: rule.frequency,
        date,
      }))
    })
    .sort((a, b) => (a.date === b.date ? a.label.localeCompare(b.label) : a.date < b.date ? -1 : 1))
}

export type ScheduledTotal = { currency: string; incomeMinor: number; expenseMinor: number }

/** Scheduled income and expense per currency, alphabetical by currency. */
export function scheduledTotals(entries: ScheduledEntry[]): ScheduledTotal[] {
  const totals = new Map<string, ScheduledTotal>()
  for (const entry of entries) {
    const row = totals.get(entry.currency) ?? {
      currency: entry.currency,
      incomeMinor: 0,
      expenseMinor: 0,
    }
    if (entry.type === 'income') row.incomeMinor += entry.amountMinor
    else row.expenseMinor += entry.amountMinor
    totals.set(entry.currency, row)
  }
  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency))
}

export type ScheduledMonth = { month: string; incomeMinor: number; expenseMinor: number }

/** Scheduled income and expense per month in one currency, with every month present. */
export function scheduledByMonth(
  entries: ScheduledEntry[],
  currency: string,
  months: string[],
): ScheduledMonth[] {
  const totals = new Map(months.map((month) => [month, { month, incomeMinor: 0, expenseMinor: 0 }]))
  for (const entry of entries) {
    const row = totals.get(monthOf(entry.date))
    if (!row || entry.currency !== currency) continue
    if (entry.type === 'income') row.incomeMinor += entry.amountMinor
    else row.expenseMinor += entry.amountMinor
  }
  return [...totals.values()]
}
