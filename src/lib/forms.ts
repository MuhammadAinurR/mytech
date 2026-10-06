import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'

import { type FieldErrors } from './result'

/** Puts server-side field errors onto a react-hook-form form, focusing the first. */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  errors: FieldErrors | undefined,
): boolean {
  let applied = false
  for (const [name, messages] of Object.entries(errors ?? {})) {
    const message = messages?.[0]
    if (!message) continue
    setError(name as Path<T>, { type: 'server', message }, { shouldFocus: !applied })
    applied = true
  }
  return applied
}
