import { describe, expect, it } from 'vitest'

import { currentMonth, formatMonth, monthRange, shiftMonth } from './months'

describe('months', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-10', -12)).toBe('2025-10')
  })

  it('builds half-open ranges and knows the last day', () => {
    expect(monthRange('2028-02')).toEqual({
      start: '2028-02-01',
      last: '2028-02-29',
      end: '2028-03-01',
    })
    expect(monthRange('2026-12')).toEqual({
      start: '2026-12-01',
      last: '2026-12-31',
      end: '2027-01-01',
    })
  })

  it('uses the user timezone for the current month', () => {
    const instant = new Date('2026-10-31T20:00:00Z')
    expect(currentMonth('UTC', instant)).toBe('2026-10')
    expect(currentMonth('Asia/Jakarta', instant)).toBe('2026-11')
  })

  it('formats for headings', () => {
    expect(formatMonth('2026-10')).toBe('October 2026')
    expect(formatMonth('2026-10', { short: true })).toBe('Oct 2026')
  })
})
