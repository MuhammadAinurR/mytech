import 'server-only'

type PgError = { code?: string; constraint?: string }

function pgError(error: unknown): PgError | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  // Drizzle wraps driver errors; the pg error is the cause.
  const candidate = 'cause' in error && error.cause ? error.cause : error
  return typeof candidate === 'object' && candidate !== null ? (candidate as PgError) : undefined
}

export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pg = pgError(error)
  return pg?.code === '23505' && (constraint === undefined || pg.constraint === constraint)
}

export function isCheckViolation(error: unknown, constraint?: string): boolean {
  const pg = pgError(error)
  return pg?.code === '23514' && (constraint === undefined || pg.constraint === constraint)
}
