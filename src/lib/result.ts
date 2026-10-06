/**
 * Typed result for expected failures (validation, not found, conflicts).
 * Unexpected failures throw and are handled by error boundaries.
 */
export type FieldErrors = Partial<Record<string, string[]>>

export type Ok<T> = { ok: true; data: T }
export type Err<E extends string = string> = { ok: false; error: E; fieldErrors?: FieldErrors }
export type Result<T = undefined, E extends string = string> = Ok<T> | Err<E>

export function ok(): Ok<undefined>
export function ok<T>(data: T): Ok<T>
export function ok<T>(data?: T): Ok<T | undefined> {
  return { ok: true, data }
}

export function err<E extends string>(error: E, fieldErrors?: FieldErrors): Err<E> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error }
}
