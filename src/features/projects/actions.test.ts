import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDb } from '@/server/db'
import { createProject, getProject } from '@/server/queries/projects'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'

import { createProjectAction, moveProjectAction } from './actions'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

describe('project actions', () => {
  it('require a session', async () => {
    await expect(moveProjectAction({})).rejects.toMatchObject({ location: '/login' })
  })

  it('reject an ongoing project without dates and accept one with them', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const invalid = await createProjectAction({
      name: 'Launch',
      description: '',
      status: 'ongoing',
      startDate: '',
      endDate: '',
    })
    expect(invalid).toMatchObject({ ok: false, error: 'invalid' })
    const created = await createProjectAction({
      name: 'Launch',
      description: '',
      status: 'ongoing',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    })
    expect(created.ok).toBe(true)
  })

  it('report the database date guard as a field error when a move would invert dates', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const p = await createProject(user.id, {
      name: 'Edge',
      description: null,
      status: 'todo',
      startDate: null,
      endDate: '2026-10-05',
    })
    const result = await moveProjectAction({
      id: p.id,
      status: 'todo',
      index: 0,
      startDate: '2026-10-10',
    })
    expect(result).toMatchObject({
      ok: false,
      error: 'invalid',
      fieldErrors: { endDate: ['End on or after the start date.'] },
    })
    expect(await getProject(user.id, p.id)).toMatchObject({ startDate: null })
  })

  it('ask for dates when moving into ongoing', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const p = await createProject(user.id, {
      name: 'Plan',
      description: null,
      status: 'todo',
      startDate: null,
      endDate: null,
    })
    expect(await moveProjectAction({ id: p.id, status: 'ongoing', index: 0 })).toEqual({
      ok: false,
      error: 'dates_required',
    })
  })
})
