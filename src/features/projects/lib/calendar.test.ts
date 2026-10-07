import { describe, expect, it } from 'vitest'

import { layoutWeek, monthWeeks, type CalendarProject } from './calendar'

describe('monthWeeks', () => {
  it('covers the month in Monday-first weeks', () => {
    const weeks = monthWeeks('2026-10')
    expect(weeks).toHaveLength(5)
    expect(weeks[0]![0]).toBe('2026-09-28') // Oct 1, 2026 is a Thursday
    expect(weeks.at(-1)![6]).toBe('2026-11-01')
    expect(weeks.flat()).toContain('2026-10-31')
  })

  it('handles months that start on a Monday and February', () => {
    expect(monthWeeks('2027-02')[0]![0]).toBe('2027-02-01')
    expect(monthWeeks('2027-02')).toHaveLength(4)
  })
})

const week = [
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
  '2026-10-08',
  '2026-10-09',
  '2026-10-10',
  '2026-10-11',
]
const p = (id: string, startDate: string, endDate: string): CalendarProject => ({
  id,
  name: id,
  startDate,
  endDate,
})

describe('layoutWeek', () => {
  it('clips bars to the week and marks continuation', () => {
    const { bars } = layoutWeek(week, [
      p('long', '2026-09-20', '2026-10-20'),
      p('inside', '2026-10-07', '2026-10-08'),
    ])
    expect(
      bars.map((b) => [
        b.project.id,
        b.startColumn,
        b.span,
        b.lane,
        b.continuesBefore,
        b.continuesAfter,
      ]),
    ).toEqual([
      ['long', 0, 7, 0, true, true],
      ['inside', 2, 2, 1, false, false],
    ])
  })

  it('reuses lanes for bars that do not overlap', () => {
    const { bars } = layoutWeek(week, [
      p('a', '2026-10-05', '2026-10-06'),
      p('b', '2026-10-07', '2026-10-09'),
      p('c', '2026-10-06', '2026-10-07'),
    ])
    expect(Object.fromEntries(bars.map((b) => [b.project.id, b.lane]))).toEqual({
      a: 0,
      c: 1,
      b: 0,
    })
  })

  it('ignores projects outside the week and counts overflow per day', () => {
    const many = [1, 2, 3, 4, 5].map((n) => p(`p${n}`, '2026-10-06', '2026-10-07'))
    const { bars, hiddenByDay } = layoutWeek(
      week,
      [...many, p('outside', '2026-10-12', '2026-10-13')],
      3,
    )
    expect(bars).toHaveLength(3)
    expect(hiddenByDay).toEqual([0, 2, 2, 0, 0, 0, 0])
  })
})

describe('lane stability', () => {
  it('keeps continuing projects in the same lane across weeks', () => {
    const projects = [
      p('Northwind', '2026-09-15', '2026-11-14'),
      p('Juniper', '2026-10-01', '2026-10-24'),
    ]
    const lanes = (days: string[]) =>
      Object.fromEntries(layoutWeek(days, projects).bars.map((b) => [b.project.id, b.lane]))
    const nextWeek = [
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]
    expect(lanes(week)).toEqual({ Northwind: 0, Juniper: 1 })
    expect(lanes(nextWeek)).toEqual({ Northwind: 0, Juniper: 1 })
  })
})
