import { addDays, parseDateOnly, type DateOnly } from '@/lib/dates'
import { monthRange } from '@/lib/months'

export type CalendarProject = { id: string; name: string; startDate: string; endDate: string }

export type WeekBar = {
  project: CalendarProject
  /** 0 = Monday … 6 = Sunday, within this week. */
  startColumn: number
  span: number
  lane: number
  continuesBefore: boolean
  continuesAfter: boolean
}

export type CalendarWeek = { days: DateOnly[]; bars: WeekBar[]; hiddenByDay: number[] }

/** ISO weekday index with Monday = 0. */
function weekdayIndex(date: DateOnly): number {
  const parts = parseDateOnly(date)!
  const day = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  return (day + 6) % 7
}

/** Monday-first weeks covering the whole month, padded with adjacent days. */
export function monthWeeks(month: string): DateOnly[][] {
  const { start, last } = monthRange(month)
  let cursor = addDays(start, -weekdayIndex(start))
  const weeks: DateOnly[][] = []
  while (cursor <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)))
    cursor = addDays(cursor, 7)
  }
  return weeks
}

/**
 * Places each project's bar on a week and packs overlapping bars into lanes
 * (earliest start first, longer bars first on ties). Bars beyond `maxLanes`
 * are counted per day as hidden so the UI can show "+N more".
 */
export function layoutWeek(
  days: DateOnly[],
  projects: CalendarProject[],
  maxLanes = 3,
): CalendarWeek {
  const weekStart = days[0]!
  const weekEnd = days[6]!
  const visible = projects
    .filter((p) => p.startDate <= weekEnd && p.endDate >= weekStart)
    .map((project) => {
      const from = project.startDate < weekStart ? weekStart : project.startDate
      const to = project.endDate > weekEnd ? weekEnd : project.endDate
      const startColumn = days.indexOf(from)
      return {
        project,
        startColumn,
        span: days.indexOf(to) - startColumn + 1,
        continuesBefore: project.startDate < weekStart,
        continuesAfter: project.endDate > weekEnd,
      }
    })
    // Order by the real start (not the clipped one) so a project keeps its lane
    // from week to week; longer projects first on ties.
    .sort(
      (a, b) =>
        a.project.startDate.localeCompare(b.project.startDate) ||
        b.project.endDate.localeCompare(a.project.endDate) ||
        a.project.name.localeCompare(b.project.name),
    )

  const laneEnds: number[] = []
  const bars: WeekBar[] = []
  const hiddenByDay = Array.from({ length: 7 }, () => 0)
  for (const bar of visible) {
    let lane = laneEnds.findIndex((end) => end < bar.startColumn)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = bar.startColumn + bar.span - 1
    if (lane < maxLanes) bars.push({ ...bar, lane })
    else for (let d = bar.startColumn; d < bar.startColumn + bar.span; d++) hiddenByDay[d]! += 1
  }
  return { days, bars, hiddenByDay }
}
