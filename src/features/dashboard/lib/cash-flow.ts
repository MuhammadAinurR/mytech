import { type ScheduledMonth } from '@/features/recurring/lib/forecast'
import type { MonthPoint } from '@/server/queries/transactions'

export type CashFlowMonth = {
  month: string
  /** In the ledger already. */
  incomeMinor: number
  expenseMinor: number
  /** Still to come from recurring rules: zero before the current month. */
  scheduledIncomeMinor: number
  scheduledExpenseMinor: number
  when: 'past' | 'current' | 'future'
}

/**
 * One row per month, oldest first: what the ledger holds, plus what recurring
 * rules will still add. The current month has both, so its bars can show the
 * money already moved and the rest of the month on top.
 */
export function cashFlow(
  actual: MonthPoint[],
  scheduled: ScheduledMonth[],
  currentMonth: string,
): CashFlowMonth[] {
  const rows = new Map<string, CashFlowMonth>()
  const row = (month: string) => {
    let found = rows.get(month)
    if (!found) {
      found = {
        month,
        incomeMinor: 0,
        expenseMinor: 0,
        scheduledIncomeMinor: 0,
        scheduledExpenseMinor: 0,
        when: month < currentMonth ? 'past' : month === currentMonth ? 'current' : 'future',
      }
      rows.set(month, found)
    }
    return found
  }
  for (const point of actual) {
    const target = row(point.month)
    target.incomeMinor += point.incomeMinor
    target.expenseMinor += point.expenseMinor
  }
  for (const point of scheduled) {
    if (point.month < currentMonth) continue
    const target = row(point.month)
    target.scheduledIncomeMinor += point.incomeMinor
    target.scheduledExpenseMinor += point.expenseMinor
  }
  return [...rows.values()].sort((a, b) => (a.month < b.month ? -1 : 1))
}
