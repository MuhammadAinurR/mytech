import { daysInMonth, todayInTimeZone, toDateOnly, type DateOnly } from './dates'

/** "YYYY-MM" for the month containing a date. */
export function monthOf(date: DateOnly): string {
  return date.slice(0, 7)
}

export function currentMonth(timeZone: string, now: Date = new Date()): string {
  return monthOf(todayInTimeZone(timeZone, now))
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number) as [number, number]
  const index = year * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

/** Inclusive first day and exclusive first day of the next month. */
export function monthRange(month: string): { start: DateOnly; end: DateOnly; last: DateOnly } {
  const [year, m] = month.split('-').map(Number) as [number, number]
  return {
    start: toDateOnly(year, m, 1),
    last: toDateOnly(year, m, daysInMonth(year, m)),
    end: shiftMonth(month, 1) + '-01',
  }
}

export function formatMonth(month: string, { short = false } = {}): string {
  const [year, m] = month.split('-').map(Number) as [number, number]
  return new Intl.DateTimeFormat('en-US', {
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, m - 1, 15)))
}
