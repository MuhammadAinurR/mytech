import { describe, expect, it } from 'vitest'

import {
  addDays,
  daysInMonth,
  diffInDays,
  formatDateOnly,
  isDateOnly,
  isValidTimeZone,
  todayInTimeZone,
} from './dates'

describe('daysInMonth', () => {
  it('knows short months and leap years', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 2)).toBe(28)
    expect(daysInMonth(2028, 2)).toBe(29)
    expect(daysInMonth(2100, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe('isDateOnly', () => {
  it('accepts real calendar dates only', () => {
    expect(isDateOnly('2026-02-28')).toBe(true)
    expect(isDateOnly('2028-02-29')).toBe(true)
    expect(isDateOnly('2026-02-29')).toBe(false)
    expect(isDateOnly('2026-13-01')).toBe(false)
    expect(isDateOnly('2026-1-01')).toBe(false)
    expect(isDateOnly('2026-01-01T00:00:00Z')).toBe(false)
  })
})

describe('todayInTimeZone', () => {
  it('uses the calendar day of the given zone', () => {
    const instant = new Date('2026-10-06T22:30:00Z')
    expect(todayInTimeZone('UTC', instant)).toBe('2026-10-06')
    expect(todayInTimeZone('Asia/Jakarta', instant)).toBe('2026-10-07')
    expect(todayInTimeZone('America/Los_Angeles', instant)).toBe('2026-10-06')
  })
})

describe('addDays and diffInDays', () => {
  it('cross month and year boundaries', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(diffInDays('2026-10-07', '2026-11-06')).toBe(30)
    expect(diffInDays('2026-10-07', '2026-10-01')).toBe(-6)
  })

  it('ignores DST transitions', () => {
    expect(diffInDays('2026-03-07', '2026-03-09')).toBe(2)
  })
})

describe('formatDateOnly', () => {
  it('never shifts the stored day', () => {
    expect(formatDateOnly('2026-01-01')).toBe('Jan 1, 2026')
    expect(formatDateOnly('2026-12-31', { style: 'short' })).toBe('Dec 31')
  })
})

describe('isValidTimeZone', () => {
  it('validates IANA names', () => {
    expect(isValidTimeZone('Asia/Jakarta')).toBe(true)
    expect(isValidTimeZone('Mars/Olympus')).toBe(false)
  })
})
