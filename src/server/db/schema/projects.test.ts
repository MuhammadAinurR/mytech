import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { projects } from '.'

afterAll(closeDb)

async function insert(overrides: Partial<typeof projects.$inferInsert>) {
  const user = await createTestUser()
  return db
    .insert(projects)
    .values({ name: 'Workbench redesign', ...overrides, userId: user.id })
    .returning()
}

describe('projects table', () => {
  it('defaults to a to-do with no dates', async () => {
    const [row] = await insert({})
    expect(row).toMatchObject({ status: 'todo', startDate: null, endDate: null, position: 0 })
  })

  it('requires both dates for ongoing projects (NULL cases included)', async () => {
    await expect(insert({ status: 'ongoing' })).rejects.toThrow()
    await expect(insert({ status: 'ongoing', startDate: '2026-10-01' })).rejects.toThrow()
    await expect(insert({ status: 'ongoing', endDate: '2026-10-31' })).rejects.toThrow()
    await expect(
      insert({ status: 'ongoing', startDate: '2026-10-01', endDate: '2026-10-31' }),
    ).resolves.toHaveLength(1)
  })

  it('keeps the end on or after the start, whatever the status', async () => {
    await expect(insert({ startDate: '2026-10-10', endDate: '2026-10-09' })).rejects.toThrow()
    await expect(
      insert({ status: 'done', startDate: '2026-10-10', endDate: '2026-10-10' }),
    ).resolves.toHaveLength(1)
    await expect(insert({ startDate: '2026-10-10' })).resolves.toHaveLength(1)
  })

  it('rejects blank names and negative positions', async () => {
    await expect(insert({ name: '   ' })).rejects.toThrow()
    await expect(insert({ position: -1 })).rejects.toThrow()
  })
})
