'use client'

import { formatDateOnly } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { InsetButtonRow, InsetSection } from '@/components/ui/inset-list'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/tooltip'
import type { ProjectItem } from '@/server/queries/projects'

import { formatDateRange } from '../lib/board'
import { layoutWeek, monthWeeks, type CalendarProject } from '../lib/calendar'
import { projectProgress } from '../lib/progress'
import { ProgressLabel, ProgressTrack } from './progress-track'
import { useProjectDialog } from './project-dialog'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MAX_LANES = 3

type Dated = ProjectItem & CalendarProject

/** Month grid with ongoing projects as range bars; an agenda list on small screens. */
export function ProjectCalendar({
  month,
  projects,
  today,
}: {
  month: string
  projects: ProjectItem[]
  today: string
}) {
  const { openEdit } = useProjectDialog()
  const dated = projects.filter((p): p is Dated => Boolean(p.startDate && p.endDate))
  const weeks = monthWeeks(month).map((days) => layoutWeek(days, dated, MAX_LANES))
  const year = today.slice(0, 4)
  const label = (p: Dated) => `${p.name}, ${formatDateRange(p.startDate, p.endDate, year)}`

  return (
    <>
      <div className="hidden px-(--gutter) pb-10 md:block">
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-7 border-b border-border bg-background">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-xs font-medium text-muted">
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week.days[0]} className="relative border-b border-border last:border-b-0">
              <div className="grid grid-cols-7">
                {week.days.map((day, index) => {
                  const outside = !day.startsWith(month)
                  const isToday = day === today
                  return (
                    <div
                      key={day}
                      className={cn(
                        'flex min-h-28 flex-col justify-between border-r border-border p-1.5 last:border-r-0',
                        outside && 'bg-background/60',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded-full tabular text-xs',
                          outside ? 'text-subtle' : 'text-muted',
                          isToday && 'bg-accent font-semibold text-accent-fg',
                        )}
                        aria-label={isToday ? `Today, ${formatDateOnly(day)}` : undefined}
                      >
                        {Number(day.slice(8))}
                      </span>
                      {week.hiddenByDay[index]! > 0 ? (
                        <MoreOnDay
                          day={day}
                          count={week.hiddenByDay[index]!}
                          projects={dated.filter((p) => p.startDate <= day && p.endDate >= day)}
                          onOpen={openEdit}
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-8 grid grid-cols-7 gap-y-1">
                {week.bars.map((bar) => (
                  <button
                    key={bar.project.id}
                    type="button"
                    onClick={() => openEdit(bar.project as Dated)}
                    aria-label={label(bar.project as Dated)}
                    style={{
                      gridColumn: `${bar.startColumn + 1} / span ${bar.span}`,
                      gridRow: bar.lane + 1,
                    }}
                    className={cn(
                      'pointer-events-auto flex h-6 min-w-0 cursor-pointer items-center bg-accent-soft px-2 text-left text-xs font-medium text-fg transition-colors hover:bg-accent/20',
                      bar.continuesBefore ? 'rounded-l-none' : 'ml-1 rounded-l-xs',
                      bar.continuesAfter ? 'rounded-r-none' : 'mr-1 rounded-r-xs',
                    )}
                  >
                    <span className="truncate">
                      {bar.continuesBefore ? '← ' : ''}
                      {bar.project.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phones: an agenda, each project with how far through its dates it is. */}
      <div data-grouped className="pb-10 md:hidden">
        <InsetSection title="Ongoing this month">
          {dated.map((project) => {
            const progress = projectProgress(project.startDate, project.endDate, today)
            return (
              <InsetButtonRow
                key={project.id}
                onClick={() => openEdit(project)}
                title={project.name}
                subtitle={
                  <>
                    <span className="tabular">
                      {formatDateRange(project.startDate, project.endDate, year)}
                    </span>
                    {' · '}
                    <ProgressLabel progress={progress} />
                  </>
                }
                detail={<ProgressTrack progress={progress} />}
              />
            )
          })}
        </InsetSection>
      </div>
    </>
  )
}

function MoreOnDay({
  day,
  count,
  projects,
  onOpen,
}: {
  day: string
  count: number
  projects: Dated[]
  onOpen: (project: ProjectItem) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative z-10 cursor-pointer self-start rounded-xs px-1 text-xs text-muted hover:text-fg"
        >
          +{count} more
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2">
        <p className="px-2 pt-1 pb-2 text-xs text-subtle">
          {formatDateOnly(day, { style: 'long' })}
        </p>
        <ul className="flex flex-col">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onOpen(project)}
                className="flex h-8 w-full cursor-pointer items-center rounded-sm px-2 text-left text-sm hover:bg-fill"
              >
                <span className="truncate">{project.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
