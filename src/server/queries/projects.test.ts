import { afterAll, describe, expect, it } from 'vitest'

import { type ProjectInput } from '@/features/projects/schema'

import { closeDb } from '../db'
import { createTestUser } from '../testing/factories'
import {
  createProject,
  deleteProject,
  getProject,
  listOngoingInRange,
  listProjects,
  moveProject,
  updateProject,
} from './projects'

afterAll(closeDb)

const project = (name: string, overrides: Partial<ProjectInput> = {}): ProjectInput => ({
  name,
  description: null,
  status: 'todo',
  startDate: null,
  endDate: null,
  ...overrides,
})

const column = async (userId: string, status: string) =>
  (await listProjects(userId)).filter((p) => p.status === status).map((p) => [p.name, p.position])

describe('board ordering', () => {
  it('appends new cards to the end of their column', async () => {
    const user = await createTestUser()
    await createProject(user.id, project('A'))
    await createProject(user.id, project('B'))
    await createProject(user.id, project('C', { status: 'done' }))
    expect(await column(user.id, 'todo')).toEqual([
      ['A', 0],
      ['B', 1],
    ])
    expect(await column(user.id, 'done')).toEqual([['C', 0]])
  })

  it('reorders within a column and moves across columns, renumbering the destination', async () => {
    const user = await createTestUser()
    const a = await createProject(user.id, project('A'))
    await createProject(user.id, project('B'))
    const c = await createProject(user.id, project('C'))
    await createProject(user.id, project('X', { status: 'done' }))

    expect((await moveProject(user.id, { id: c.id, status: 'todo', index: 0 })).ok).toBe(true)
    expect(await column(user.id, 'todo')).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2],
    ])

    expect((await moveProject(user.id, { id: a.id, status: 'done', index: 1 })).ok).toBe(true)
    expect(await column(user.id, 'done')).toEqual([
      ['X', 0],
      ['A', 1],
    ])

    // An index past the end lands at the end.
    expect((await moveProject(user.id, { id: c.id, status: 'done', index: 99 })).ok).toBe(true)
    expect(await column(user.id, 'done')).toEqual([
      ['X', 0],
      ['A', 1],
      ['C', 2],
    ])
  })

  it('needs dates to enter ongoing, either stored or sent with the move', async () => {
    const user = await createTestUser()
    const p = await createProject(user.id, project('Launch'))
    expect(await moveProject(user.id, { id: p.id, status: 'ongoing', index: 0 })).toEqual({
      ok: false,
      error: 'dates_required',
    })
    const moved = await moveProject(user.id, {
      id: p.id,
      status: 'ongoing',
      index: 0,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    })
    expect(moved).toMatchObject({ ok: true, data: { status: 'ongoing', startDate: '2026-10-01' } })

    // Moving back out keeps the dates; moving in again needs nothing new.
    await moveProject(user.id, { id: p.id, status: 'todo', index: 0 })
    expect((await moveProject(user.id, { id: p.id, status: 'ongoing', index: 0 })).ok).toBe(true)
  })

  it('keeps a clean sequence under concurrent moves', async () => {
    const user = await createTestUser()
    const cards = []
    for (const name of ['A', 'B', 'C', 'D', 'E', 'F'])
      cards.push(await createProject(user.id, project(name)))
    await Promise.all(
      cards.map((card, i) => moveProject(user.id, { id: card.id, status: 'done', index: i % 3 })),
    )
    const positions = (await listProjects(user.id))
      .filter((p) => p.status === 'done')
      .map((p) => p.position)
    expect(positions).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('appends to the new column when a status changes through an edit', async () => {
    const user = await createTestUser()
    await createProject(user.id, project('Existing', { status: 'done' }))
    const p = await createProject(user.id, project('Edited'))
    await updateProject(user.id, p.id, project('Edited', { status: 'done' }))
    expect(await column(user.id, 'done')).toEqual([
      ['Existing', 0],
      ['Edited', 1],
    ])
  })
})

describe('calendar range', () => {
  it('returns ongoing projects overlapping the range, inclusive of edges', async () => {
    const user = await createTestUser()
    const window = (name: string, startDate: string, endDate: string) =>
      createProject(user.id, project(name, { status: 'ongoing', startDate, endDate }))
    await window('Before', '2026-09-01', '2026-09-30')
    await window('Touches start', '2026-09-20', '2026-10-01')
    await window('Inside', '2026-10-10', '2026-10-12')
    await window('Spans', '2026-09-01', '2026-12-31')
    await window('Touches end', '2026-10-31', '2026-11-15')
    await window('After', '2026-11-01', '2026-11-30')
    await createProject(
      user.id,
      project('Done with dates', {
        status: 'done',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
      }),
    )

    const names = (await listOngoingInRange(user.id, '2026-10-01', '2026-10-31')).map((p) => p.name)
    expect(names).toEqual(['Spans', 'Touches start', 'Inside', 'Touches end'])
  })
})

describe('projects isolation', () => {
  it('never exposes, moves, or deletes another user’s projects', async () => {
    const owner = await createTestUser()
    const intruder = await createTestUser()
    const mine = await createProject(owner.id, project('Private'))

    expect(await getProject(intruder.id, mine.id)).toBeNull()
    expect(await listProjects(intruder.id)).toEqual([])
    expect(await moveProject(intruder.id, { id: mine.id, status: 'done', index: 0 })).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await updateProject(intruder.id, mine.id, project('Hijacked'))).toBeNull()
    expect(await deleteProject(intruder.id, mine.id)).toBe(false)
    expect(await getProject(owner.id, mine.id)).toMatchObject({ name: 'Private', status: 'todo' })
  })
})
