import { describe, expect, it } from 'vitest'

import { projectInputSchema, projectMoveSchema } from './schema'

const base = { name: 'Redesign', description: '', status: 'todo', startDate: '', endDate: '' }
const errors = (input: Record<string, string>) => {
  const r = projectInputSchema.safeParse(input)
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]))
}

describe('project schemas', () => {
  it('turns blanks into nulls', () => {
    expect(projectInputSchema.parse(base)).toEqual({
      name: 'Redesign',
      description: null,
      status: 'todo',
      startDate: null,
      endDate: null,
    })
  })

  it('requires both dates for ongoing projects', () => {
    expect(errors({ ...base, status: 'ongoing' })).toEqual({
      startDate: 'Ongoing projects need a start date.',
      endDate: 'Ongoing projects need an end date.',
    })
    expect(
      errors({ ...base, status: 'ongoing', startDate: '2026-10-01', endDate: '2026-10-31' }),
    ).toEqual({})
  })

  it('keeps end on or after start for any status', () => {
    expect(errors({ ...base, startDate: '2026-10-10', endDate: '2026-10-09' })).toEqual({
      endDate: 'End on or after the start date.',
    })
    expect(errors({ ...base, startDate: '2026-02-30' })).toEqual({
      startDate: 'Enter a valid date.',
    })
  })

  it('validates moves, including dates sent along', () => {
    const id = crypto.randomUUID()
    expect(projectMoveSchema.safeParse({ id, status: 'done', index: 0 }).success).toBe(true)
    expect(projectMoveSchema.safeParse({ id, status: 'done', index: -1 }).success).toBe(false)
    expect(
      projectMoveSchema.safeParse({
        id,
        status: 'ongoing',
        index: 0,
        startDate: '2026-10-10',
        endDate: '2026-10-01',
      }).success,
    ).toBe(false)
  })
})
