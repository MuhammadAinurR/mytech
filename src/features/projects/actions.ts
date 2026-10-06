'use server'

import { revalidatePath } from 'next/cache'

import { err, ok, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { createProject, deleteProject, moveProject, updateProject } from '@/server/queries/projects'

import { projectInputSchema, projectMoveSchema } from './schema'

function refresh() {
  revalidatePath('/projects', 'layout')
  revalidatePath('/dashboard')
}

export async function createProjectAction(
  input: unknown,
): Promise<Result<{ id: string }, 'invalid'>> {
  const user = await requireUser()
  const parsed = projectInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))
  const project = await createProject(user.id, parsed.data)
  refresh()
  return ok({ id: project.id })
}

export async function updateProjectAction(
  id: unknown,
  input: unknown,
): Promise<Result<undefined, 'invalid' | 'not_found'>> {
  const user = await requireUser()
  const projectId = uuidSchema.safeParse(id)
  if (!projectId.success) return err('not_found')
  const parsed = projectInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))
  if (!(await updateProject(user.id, projectId.data, parsed.data))) return err('not_found')
  refresh()
  return ok()
}

export async function deleteProjectAction(id: unknown): Promise<Result<undefined, 'not_found'>> {
  const user = await requireUser()
  const projectId = uuidSchema.safeParse(id)
  if (!projectId.success) return err('not_found')
  if (!(await deleteProject(user.id, projectId.data))) return err('not_found')
  refresh()
  return ok()
}

export async function moveProjectAction(
  input: unknown,
): Promise<Result<undefined, 'invalid' | 'not_found' | 'dates_required'>> {
  const user = await requireUser()
  const parsed = projectMoveSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))
  const result = await moveProject(user.id, parsed.data)
  if (!result.ok) {
    return result.error === 'invalid_dates'
      ? err('invalid', { endDate: ['End on or after the start date.'] })
      : err(result.error)
  }
  refresh()
  return ok()
}
