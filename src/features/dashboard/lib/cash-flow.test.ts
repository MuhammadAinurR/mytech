import { describe, expect, it } from 'vitest'

import { cashFlow } from './cash-flow'

describe('cashFlow', () => {
  it('pairs the ledger with what is still scheduled, from the current month on', () => {
    const actual = [
      { month: '2026-09', incomeMinor: 100, expenseMinor: 40, netMinor: 60 },
      { month: '2026-10', incomeMinor: 50, expenseMinor: 30, netMinor: 20 },
    ]
    const scheduled = [
      // Before the current month nothing is "still to come".
      { month: '2026-09', incomeMinor: 999, expenseMinor: 999 },
      { month: '2026-10', incomeMinor: 0, expenseMinor: 10 },
      { month: '2026-11', incomeMinor: 5, expenseMinor: 20 },
    ]
    expect(cashFlow(actual, scheduled, '2026-10')).toEqual([
      {
        month: '2026-09',
        incomeMinor: 100,
        expenseMinor: 40,
        scheduledIncomeMinor: 0,
        scheduledExpenseMinor: 0,
        when: 'past',
      },
      {
        month: '2026-10',
        incomeMinor: 50,
        expenseMinor: 30,
        scheduledIncomeMinor: 0,
        scheduledExpenseMinor: 10,
        when: 'current',
      },
      {
        month: '2026-11',
        incomeMinor: 0,
        expenseMinor: 0,
        scheduledIncomeMinor: 5,
        scheduledExpenseMinor: 20,
        when: 'future',
      },
    ])
  })
})
