import { describe, expect, it } from 'vitest'

import { applyMove, findColumn, formatDateRange, groupByStatus } from './board'

const cards = [
  { id: 'a', status: 'todo' as const },
  { id: 'b', status: 'todo' as const },
  { id: 'c', status: 'ongoing' as const },
]

describe('board helpers', () => {
  it('groups by status in order', () => {
    expect(groupByStatus(cards)).toEqual({
      todo: [cards[0], cards[1]],
      ongoing: [cards[2]],
      done: [],
    })
  })

  it('moves within and across columns without mutating the input', () => {
    const columns = groupByStatus(cards)
    const reordered = applyMove(columns, 'b', 'todo', 0)
    expect(reordered.todo.map((c) => c.id)).toEqual(['b', 'a'])
    const moved = applyMove(columns, 'a', 'done', 5)
    expect(moved.done).toEqual([{ id: 'a', status: 'done' }])
    expect(moved.todo.map((c) => c.id)).toEqual(['b'])
    expect(columns.todo.map((c) => c.id)).toEqual(['a', 'b'])
    expect(findColumn(moved, 'a')).toBe('done')
    expect(findColumn(moved, 'zzz')).toBeNull()
  })

  it('formats ranges compactly', () => {
    expect(formatDateRange('2026-10-01', '2026-10-31', '2026')).toBe('Oct 1 – Oct 31')
    expect(formatDateRange('2026-12-20', '2027-01-10', '2026')).toBe('Dec 20, 2026 – Jan 10, 2027')
    expect(formatDateRange('2027-03-01', '2027-03-05', '2026')).toBe('Mar 1 – Mar 5, 2027')
    expect(formatDateRange('2026-10-07', '2026-10-07', '2026')).toBe('Oct 7')
  })
})
