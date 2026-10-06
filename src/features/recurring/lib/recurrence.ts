import { addDays, daysInMonth, parseDateOnly, toDateOnly, type DateOnly } from '@/lib/dates'

export type Frequency = 'monthly' | 'yearly'

export type RecurrenceSpec = {
  frequency: Frequency
  /** 1–31. Days past the end of a month clamp to its last day. */
  dayOfMonth: number
  /** 1–12, yearly rules only. */
  monthOfYear: number | null
  startsOn: DateOnly
  endsOn: DateOnly | null
}

/**
 * The calendar date a rule lands on in a given month. Clamping is done per
 * month, so a rule on the 31st falls on Jan 31, Feb 28 (or 29), Mar 31, Apr 30.
 * A yearly rule on Feb 29 falls on Feb 28 in common years.
 */
export function occurrenceIn(year: number, month: number, dayOfMonth: number): DateOnly {
  return toDateOnly(year, month, Math.min(dayOfMonth, daysInMonth(year, month)))
}

/** First occurrence on or after `onOrAfter` (and on or after the start), or null past the end. */
export function nextOccurrence(spec: RecurrenceSpec, onOrAfter: DateOnly): DateOnly | null {
  const from = onOrAfter > spec.startsOn ? onOrAfter : spec.startsOn
  const parts = parseDateOnly(from)
  if (!parts) throw new RangeError(`Invalid date: ${from}`)

  let candidate: DateOnly
  if (spec.frequency === 'monthly') {
    candidate = occurrenceIn(parts.year, parts.month, spec.dayOfMonth)
    if (candidate < from) {
      const nextMonth = parts.month === 12 ? 1 : parts.month + 1
      const nextYear = parts.month === 12 ? parts.year + 1 : parts.year
      candidate = occurrenceIn(nextYear, nextMonth, spec.dayOfMonth)
    }
  } else {
    if (spec.monthOfYear === null) throw new RangeError('Yearly rules need a month')
    candidate = occurrenceIn(parts.year, spec.monthOfYear, spec.dayOfMonth)
    if (candidate < from)
      candidate = occurrenceIn(parts.year + 1, spec.monthOfYear, spec.dayOfMonth)
  }

  if (spec.endsOn && candidate > spec.endsOn) return null
  return candidate
}

/** Every occurrence in [from, to], oldest first, capped at `limit`. */
export function occurrencesBetween(
  spec: RecurrenceSpec,
  from: DateOnly,
  to: DateOnly,
  limit = 1000,
): DateOnly[] {
  const dates: DateOnly[] = []
  let next = nextOccurrence(spec, from)
  while (next && next <= to && dates.length < limit) {
    dates.push(next)
    next = nextOccurrence(spec, addDays(next, 1))
  }
  return dates
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function ordinal(n: number): string {
  const suffix =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th'
  return `${n}${suffix}`
}

/** "Monthly on the 31st" / "Yearly on February 29". */
export function describeSchedule(
  spec: Pick<RecurrenceSpec, 'frequency' | 'dayOfMonth' | 'monthOfYear'>,
): string {
  if (spec.frequency === 'monthly') return `Monthly on the ${ordinal(spec.dayOfMonth)}`
  return `Yearly on ${MONTHS[(spec.monthOfYear ?? 1) - 1]} ${spec.dayOfMonth}`
}

export function monthName(month: number): string {
  return MONTHS[month - 1] ?? ''
}
