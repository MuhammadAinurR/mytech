import { z } from 'zod'

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
