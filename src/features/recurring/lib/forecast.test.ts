import { describe, expect, it } from 'vitest'

import { scheduledByMonth, scheduledEntries, scheduledTotals, type ScheduledRule } from './forecast'

const rule = (overrides: Partial<ScheduledRule> = {}): ScheduledRule => ({
  id: 'vps',
  label: 'VPS',
  type: 'expense',
  amountMinor: 250_000,
  currency: 'IDR',
  frequency: 'monthly',
  dayOfMonth: 5,
  monthOfYear: null,
  startsOn: '2026-01-01',
  endsOn: null,
  generatedThrough: null,
  ...overrides,
})

const dates = (rules: ScheduledRule[], today: string, until: string) =>
  scheduledEntries(rules, today, until).map((entry) => entry.date)

describe('scheduledEntries', () => {
  it('lists monthly and yearly occurrences in the window, soonest first', () => {
    const domain = rule({
      id: 'domain',
      label: 'rofiq.id',
      frequency: 'yearly',
      dayOfMonth: 20,
      monthOfYear: 12,
      amountMinor: 300_000,
    })
    expect(
      scheduledEntries([rule(), domain], '2026-10-28', '2027-01-31').map((entry) => [
        entry.date,
        entry.label,
        entry.frequency,
      ]),
    ).toEqual([
      ['2026-11-05', 'VPS', 'monthly'],
      ['2026-12-05', 'VPS', 'monthly'],
      ['2026-12-20', 'rofiq.id', 'yearly'],
      ['2027-01-05', 'VPS', 'monthly'],
    ])
  })

  it('leaves out what the worker already created, and never schedules the past', () => {
    // Once the cursor reaches today's occurrence, it's a transaction.
    expect(dates([rule({ generatedThrough: '2026-11-05' })], '2026-11-05', '2026-12-31')).toEqual([
      '2026-12-05',
    ])
    expect(dates([rule({ generatedThrough: '2026-11-04' })], '2026-11-05', '2026-12-31')).toEqual([
      '2026-11-05',
      '2026-12-05',
    ])
    // A cursor far behind (the worker catching up) still starts at today.
    expect(dates([rule({ generatedThrough: '2026-06-30' })], '2026-11-05', '2026-12-31')).toEqual([
      '2026-11-05',
      '2026-12-05',
    ])
  })

  it('respects a rule’s start and end', () => {
    expect(
      dates([rule({ startsOn: '2026-12-01', endsOn: '2027-01-31' })], '2026-10-28', '2027-06-30'),
    ).toEqual(['2026-12-05', '2027-01-05'])
  })
})

describe('scheduled totals', () => {
  const entries = scheduledEntries(
    [
      rule(),
      rule({
        id: 'retainer',
        label: 'Retainer',
        type: 'income',
        amountMinor: 5_000_000,
        dayOfMonth: 1,
      }),
      rule({ id: 'saas', label: 'SaaS', currency: 'USD', amountMinor: 1_200, dayOfMonth: 15 }),
    ],
    '2026-10-28',
    '2026-12-31',
  )

  it('sums each month in one currency, with empty months present', () => {
    expect(scheduledByMonth(entries, 'IDR', ['2026-10', '2026-11', '2026-12', '2027-01'])).toEqual([
      { month: '2026-10', incomeMinor: 0, expenseMinor: 0 },
      { month: '2026-11', incomeMinor: 5_000_000, expenseMinor: 250_000 },
      { month: '2026-12', incomeMinor: 5_000_000, expenseMinor: 250_000 },
      { month: '2027-01', incomeMinor: 0, expenseMinor: 0 },
    ])
  })

  it('sums each currency on its own', () => {
    expect(scheduledTotals(entries)).toEqual([
      { currency: 'IDR', incomeMinor: 10_000_000, expenseMinor: 500_000 },
      { currency: 'USD', incomeMinor: 0, expenseMinor: 2_400 },
    ])
  })
})
