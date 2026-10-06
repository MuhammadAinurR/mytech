/**
 * Pure calendar dates (due dates, project ranges, occurrences) are handled as
 * "YYYY-MM-DD" strings end to end. They never pass through a Date in local
 * time, so they cannot shift by a day across timezones.
 */

export type DateOnly = string

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one (UTC, no DST effects).
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function parseDateOnly(value: string): { year: number; month: number; day: number } | null {
  const match = DATE_ONLY.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

export function isDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null
}

export function toDateOnly(year: number, month: number, day: number): DateOnly {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Today's calendar date as seen in the given IANA timezone. */
export function todayInTimeZone(timeZone: string, now: Date = new Date()): DateOnly {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const parts = parseDateOnly(date)
  if (!parts) throw new RangeError(`Invalid date: ${date}`)
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return toDateOnly(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function diffInDays(from: DateOnly, to: DateOnly): number {
  const a = parseDateOnly(from)
  const b = parseDateOnly(to)
  if (!a || !b) throw new RangeError('Invalid date')
  const ms = Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)
  return Math.round(ms / 86_400_000)
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

type DateStyle = 'short' | 'medium' | 'long'

const dateStyles: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { month: 'short', day: 'numeric' },
  medium: { month: 'short', day: 'numeric', year: 'numeric' },
  long: { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' },
}

export function formatDateOnly(
  date: DateOnly,
  { style = 'medium', locale = 'en-US' }: { style?: DateStyle; locale?: string } = {},
): string {
  const parts = parseDateOnly(date)
  if (!parts) return date
  // Format at UTC noon in UTC so the calendar day is exactly what was stored.
  const instant = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))
  return new Intl.DateTimeFormat(locale, { ...dateStyles[style], timeZone: 'UTC' }).format(instant)
}

export function formatDateTime(
  instant: Date,
  timeZone: string,
  { locale = 'en-US' }: { locale?: string } = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(instant)
}

/** "Today", "Tomorrow", "in 12 days", "3 days ago". */
export function describeDaysUntil(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return days > 0 ? `in ${days} days` : `${-days} days ago`
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", or a date for older instants. */
export function formatRelativeTime(instant: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - instant.getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(instant)
}
