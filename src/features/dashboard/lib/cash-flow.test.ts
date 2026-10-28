import { describe, expect, it } from 'vitest'

import { cashFlow, niceCeiling } from './cash-flow'

describe('niceCeiling', () => {
  it('rounds up to a clean top tick whose half is clean too', () => {
    expect(niceCeiling(1_012_270)).toBe(1_200_000) // $10,122.70 → $12K
    expect(niceCeiling(1_500_000)).toBe(1_500_000) // Rp 1.5M stays
    expect(niceCeiling(2_100)).toBe(3_000)
    expect(niceCeiling(9_001)).toBe(10_000)
    expect(niceCeiling(1)).toBe(1)
    expect(niceCeiling(0)).toBe(0)
  })
})

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
