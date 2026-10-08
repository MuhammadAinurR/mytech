import { describe, expect, it } from 'vitest'

import { projectProgress } from './progress'

describe('projectProgress', () => {
  it('counts the days of a running project, both ends included', () => {
    // Oct 1–10 is ten days; on Oct 3 three of them have begun.
    expect(projectProgress('2026-10-01', '2026-10-10', '2026-10-03')).toEqual({
      phase: 'active',
      fraction: 0.3,
      label: '7 days left',
    })
  })

  it('names the first and last days', () => {
    expect(projectProgress('2026-10-01', '2026-10-10', '2026-10-01').fraction).toBe(0.1)
    expect(projectProgress('2026-10-01', '2026-10-10', '2026-10-09').label).toBe('1 day left')
    expect(projectProgress('2026-10-01', '2026-10-10', '2026-10-10')).toEqual({
      phase: 'active',
      fraction: 1,
      label: 'Last day',
    })
    expect(projectProgress('2026-10-05', '2026-10-05', '2026-10-05').label).toBe('Last day')
  })

  it('says when an upcoming project starts', () => {
    expect(projectProgress('2026-10-11', '2026-10-20', '2026-10-10')).toEqual({
      phase: 'upcoming',
      fraction: 0,
      label: 'Starts tomorrow',
    })
    expect(projectProgress('2026-10-14', '2026-10-20', '2026-10-10').label).toBe('Starts in 4 days')
  })

  it('marks a project still going past its end date as overdue', () => {
    expect(projectProgress('2026-09-01', '2026-10-09', '2026-10-10')).toEqual({
      phase: 'overdue',
      fraction: 1,
      label: '1 day overdue',
    })
    expect(projectProgress('2026-09-01', '2026-10-01', '2026-10-10').label).toBe('9 days overdue')
  })
})
