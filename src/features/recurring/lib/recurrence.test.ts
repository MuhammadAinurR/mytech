import { describe, expect, it } from 'vitest'

import {
  describeSchedule,
  nextOccurrence,
  occurrenceIn,
  occurrencesBetween,
  type RecurrenceSpec,
} from './recurrence'

const monthly = (dayOfMonth: number, extra: Partial<RecurrenceSpec> = {}): RecurrenceSpec => ({
  frequency: 'monthly',
  dayOfMonth,
  monthOfYear: null,
  startsOn: '2026-01-01',
  endsOn: null,
  ...extra,
})

const yearly = (
  monthOfYear: number,
  dayOfMonth: number,
  extra: Partial<RecurrenceSpec> = {},
): RecurrenceSpec => ({
  frequency: 'yearly',
  dayOfMonth,
  monthOfYear,
  startsOn: '2026-01-01',
  endsOn: null,
  ...extra,
})

describe('occurrenceIn', () => {
  it('clamps to the last day of short months', () => {
    expect(occurrenceIn(2026, 2, 31)).toBe('2026-02-28')
    expect(occurrenceIn(2028, 2, 31)).toBe('2028-02-29')
    expect(occurrenceIn(2026, 4, 31)).toBe('2026-04-30')
    expect(occurrenceIn(2026, 2, 29)).toBe('2026-02-28')
    expect(occurrenceIn(2026, 1, 31)).toBe('2026-01-31')
  })
})

describe('monthly rules', () => {
  it('on the 31st clamp per month and never drift', () => {
    expect(occurrencesBetween(monthly(31), '2026-01-01', '2026-06-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ])
  })

  it('on the 30th land on Feb 28 or 29 depending on the year', () => {
    expect(occurrencesBetween(monthly(30), '2028-01-15', '2028-03-31')).toEqual([
      '2028-01-30',
      '2028-02-29',
      '2028-03-30',
    ])
  })

  it('include the start date itself and roll over the year end', () => {
    expect(nextOccurrence(monthly(15), '2026-03-15')).toBe('2026-03-15')
    expect(nextOccurrence(monthly(15), '2026-03-16')).toBe('2026-04-15')
    expect(nextOccurrence(monthly(5), '2026-12-06')).toBe('2027-01-05')
  })

  it('respect the start and end dates', () => {
    const spec = monthly(10, { startsOn: '2026-03-11', endsOn: '2026-06-10' })
    expect(nextOccurrence(spec, '2026-01-01')).toBe('2026-04-10')
    expect(occurrencesBetween(spec, '2026-01-01', '2026-12-31')).toEqual([
      '2026-04-10',
      '2026-05-10',
      '2026-06-10',
    ])
    expect(nextOccurrence(spec, '2026-06-11')).toBeNull()
  })
})

describe('yearly rules', () => {
  it('on Feb 29 fall on Feb 28 in common years and Feb 29 in leap years', () => {
    expect(occurrencesBetween(yearly(2, 29), '2026-01-01', '2030-12-31')).toEqual([
      '2026-02-28',
      '2027-02-28',
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
    ])
  })

  it('move to next year once this year’s date has passed', () => {
    expect(nextOccurrence(yearly(10, 7), '2026-10-07')).toBe('2026-10-07')
    expect(nextOccurrence(yearly(10, 7), '2026-10-08')).toBe('2027-10-07')
  })

  it('handle the 31st of a 30-day month', () => {
    expect(nextOccurrence(yearly(9, 31), '2026-01-01')).toBe('2026-09-30')
  })

  it('stop after the end date', () => {
    expect(nextOccurrence(yearly(3, 1, { endsOn: '2026-12-31' }), '2026-04-01')).toBeNull()
  })
})

describe('occurrencesBetween', () => {
  it('honors the limit', () => {
    expect(occurrencesBetween(monthly(1), '2026-01-01', '2030-01-01', 3)).toHaveLength(3)
  })

  it('is empty when the range ends before the first occurrence', () => {
    expect(occurrencesBetween(monthly(20), '2026-01-01', '2026-01-19')).toEqual([])
  })
})

describe('describeSchedule', () => {
  it('reads naturally', () => {
    expect(describeSchedule(monthly(1))).toBe('Monthly on the 1st')
    expect(describeSchedule(monthly(22))).toBe('Monthly on the 22nd')
    expect(describeSchedule(monthly(13))).toBe('Monthly on the 13th')
    expect(describeSchedule(monthly(31))).toBe('Monthly on the 31st')
    expect(describeSchedule(yearly(2, 29))).toBe('Yearly on February 29')
  })
})
