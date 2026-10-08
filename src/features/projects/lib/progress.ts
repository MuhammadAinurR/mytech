import { diffInDays, type DateOnly } from '@/lib/dates'

export type ProjectProgress = {
  phase: 'upcoming' | 'active' | 'overdue'
  /** Share of the project's days that have begun, 0 to 1. */
  fraction: number
  /** "7 days left", "Last day", "Starts tomorrow", "3 days overdue". */
  label: string
}

const days = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`

/**
 * Where `today` falls in an ongoing project's start–end range (both days
 * included). Past the end date it is overdue, since it is still ongoing.
 */
export function projectProgress(
  startDate: DateOnly,
  endDate: DateOnly,
  today: DateOnly,
): ProjectProgress {
  const untilStart = diffInDays(today, startDate)
  if (untilStart > 0) {
    return {
      phase: 'upcoming',
      fraction: 0,
      label: untilStart === 1 ? 'Starts tomorrow' : `Starts in ${days(untilStart)}`,
    }
  }
  const left = diffInDays(today, endDate)
  if (left < 0) {
    return { phase: 'overdue', fraction: 1, label: `${days(-left)} overdue` }
  }
  const total = diffInDays(startDate, endDate) + 1
  return {
    phase: 'active',
    fraction: (total - left) / total,
    label: left === 0 ? 'Last day' : `${days(left)} left`,
  }
}
