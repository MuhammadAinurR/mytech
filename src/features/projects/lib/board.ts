import { PROJECT_STATUSES, type ProjectStatus } from '../schema'

export type BoardCard = { id: string; status: ProjectStatus }
export type Columns<T extends BoardCard> = Record<ProjectStatus, T[]>

export function groupByStatus<T extends BoardCard>(items: T[]): Columns<T> {
  const columns = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, [] as T[]])) as Columns<T>
  for (const item of items) columns[item.status].push(item)
  return columns
}

export function findColumn<T extends BoardCard>(
  columns: Columns<T>,
  id: string,
): ProjectStatus | null {
  return PROJECT_STATUSES.find((status) => columns[status].some((card) => card.id === id)) ?? null
}

/** Returns new columns with `id` moved to `index` in `to` (index clamped). */
export function applyMove<T extends BoardCard>(
  columns: Columns<T>,
  id: string,
  to: ProjectStatus,
  index: number,
): Columns<T> {
  const from = findColumn(columns, id)
  if (!from) return columns
  const card = columns[from].find((c) => c.id === id)!
  const next = { ...columns, [from]: columns[from].filter((c) => c.id !== id) }
  const target = [...next[to]]
  target.splice(Math.max(0, Math.min(index, target.length)), 0, { ...card, status: to })
  return { ...next, [to]: target }
}

/** "Oct 1 – Oct 31", "Dec 20, 2026 – Jan 10, 2027", or a single day. */
export function formatDateRange(start: string, end: string, currentYear: string): string {
  const fmt = (date: string, withYear: boolean) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    }).format(new Date(`${date}T12:00:00Z`))
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  const showYear = !sameYear || start.slice(0, 4) !== currentYear
  if (start === end) return fmt(start, showYear)
  return `${fmt(start, showYear && !sameYear)} – ${fmt(end, showYear)}`
}
