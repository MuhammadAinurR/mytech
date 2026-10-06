import { z } from 'zod'

import { isDateOnly } from '@/lib/dates'
import { uuidSchema } from '@/lib/validation'

export const PROJECT_STATUSES = ['todo', 'ongoing', 'done'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  todo: 'To do',
  ongoing: 'Ongoing',
  done: 'Done',
}

/** Shared date rules: ongoing needs a window, and a window never runs backwards. */
function checkDates(
  value: { status: ProjectStatus; startDate: string; endDate: string },
  ctx: z.RefinementCtx,
) {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message })
  if (value.startDate !== '' && !isDateOnly(value.startDate))
    issue('startDate', 'Enter a valid date.')
  if (value.endDate !== '' && !isDateOnly(value.endDate)) issue('endDate', 'Enter a valid date.')
  if (value.status === 'ongoing') {
    if (value.startDate === '') issue('startDate', 'Ongoing projects need a start date.')
    if (value.endDate === '') issue('endDate', 'Ongoing projects need an end date.')
  }
  if (isDateOnly(value.startDate) && isDateOnly(value.endDate) && value.endDate < value.startDate) {
    issue('endDate', 'End on or after the start date.')
  }
}

export const projectFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name this project.').max(160, 'Use 160 characters or fewer.'),
    description: z.string().trim().max(2000, 'Use 2,000 characters or fewer.'),
    status: z.enum(PROJECT_STATUSES, 'Choose a status.'),
    startDate: z.string().trim(),
    endDate: z.string().trim(),
  })
  .superRefine(checkDates)

export type ProjectFormValues = z.input<typeof projectFormSchema>

export const projectInputSchema = projectFormSchema.transform((value) => ({
  name: value.name,
  description: value.description || null,
  status: value.status,
  startDate: value.startDate || null,
  endDate: value.endDate || null,
}))

export type ProjectInput = z.output<typeof projectInputSchema>

/** A board move: target column and index, plus dates when entering "ongoing". */
export const projectMoveSchema = z
  .object({
    id: uuidSchema,
    status: z.enum(PROJECT_STATUSES),
    index: z.number().int().min(0).max(10_000),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate !== undefined || value.endDate !== undefined) {
      checkDates(
        { status: value.status, startDate: value.startDate ?? '', endDate: value.endDate ?? '' },
        ctx,
      )
    }
  })

export type ProjectMove = z.output<typeof projectMoveSchema>
