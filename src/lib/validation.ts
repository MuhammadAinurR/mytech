import { z } from 'zod'

import { isDateOnly } from './dates'
import { type FieldErrors } from './result'

/** zod error → `{ field: ['message'] }` for forms and action results. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors
}

/** Reads a string field from FormData (missing or File values become ''). */
export function formString(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export const dateOnlySchema = z.string().trim().refine(isDateOnly, 'Enter a valid date.')

export const uuidSchema = z.uuid()

/** "YYYY-MM" month keys used in URLs and summaries. */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Enter a valid month.')

/** Search params arrive as string | string[] | undefined; take the first value. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** 1-based page number from a search param, falling back to 1. */
export const pageParamSchema = z.coerce.number().int().min(1).max(10_000).catch(1)
