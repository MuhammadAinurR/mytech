import { describe, expect, it } from 'vitest'

import { recurringRuleInputSchema } from './schema'

const base = {
  label: 'workbench.dev',
  type: 'expense',
  amount: '18',
  currency: 'USD',
  category: 'Domains',
  note: '',
  frequency: 'yearly',
  dayOfMonth: '29',
  monthOfYear: '2',
  startsOn: '2026-01-01',
  endsOn: '',
  reminderDaysBefore: '14',
}

const errorsOf = (input: Record<string, string>) => {
  const result = recurringRuleInputSchema.safeParse(input)
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((i) => [i.path[0], i.message]))
}

describe('recurringRuleInputSchema', () => {
  it('converts editor strings into a stored rule', () => {
    expect(recurringRuleInputSchema.parse(base)).toEqual({
      label: 'workbench.dev',
      type: 'expense',
      amountMinor: 1800,
      currency: 'USD',
      category: 'Domains',
      note: null,
      frequency: 'yearly',
      dayOfMonth: 29,
      monthOfYear: 2,
      startsOn: '2026-01-01',
      endsOn: null,
      reminderDaysBefore: 14,
    })
  })

  it('drops the month for monthly rules and allows no reminder', () => {
    const parsed = recurringRuleInputSchema.parse({
      ...base,
      frequency: 'monthly',
      monthOfYear: '7',
      reminderDaysBefore: '',
    })
    expect(parsed).toMatchObject({
      frequency: 'monthly',
      monthOfYear: null,
      reminderDaysBefore: null,
    })
  })

  it('requires a month for yearly rules', () => {
    expect(errorsOf({ ...base, monthOfYear: '' })).toEqual({ monthOfYear: 'Choose a month.' })
    expect(errorsOf({ ...base, monthOfYear: '13' })).toEqual({ monthOfYear: 'Choose a month.' })
  })

  it('validates day, end date, and reminder bounds', () => {
    expect(errorsOf({ ...base, dayOfMonth: '0' })).toEqual({
      dayOfMonth: 'Choose a day from 1 to 31.',
    })
    expect(errorsOf({ ...base, dayOfMonth: '32' })).toEqual({
      dayOfMonth: 'Choose a day from 1 to 31.',
    })
    expect(errorsOf({ ...base, endsOn: '2025-12-31' })).toEqual({
      endsOn: 'End on or after the start date.',
    })
    expect(errorsOf({ ...base, reminderDaysBefore: '400' })).toEqual({
      reminderDaysBefore: 'Use 0 to 365 days.',
    })
    expect(errorsOf({ ...base, reminderDaysBefore: '-1' })).toEqual({
      reminderDaysBefore: 'Use 0 to 365 days.',
    })
  })
})
