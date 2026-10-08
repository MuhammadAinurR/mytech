import type { Metadata } from 'next'

import { CachedView } from '@/components/app-shell/cached-view'
import { MonthNav } from '@/components/month-nav'
import { PageSkeleton } from '@/components/page-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { ProjectCalendar } from '@/features/projects/components/project-calendar'
import {
  NewProjectButton,
  ProjectDialogProvider,
} from '@/features/projects/components/project-dialog'
import {
  ProjectsViewButton,
  ProjectsViewSwitch,
} from '@/features/projects/components/projects-view-switch'
import { monthWeeks } from '@/features/projects/lib/calendar'
import { todayInTimeZone } from '@/lib/dates'
import { currentMonth, formatMonth } from '@/lib/months'
import { firstParam, monthSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { listOngoingInRange } from '@/server/queries/projects'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Project calendar' }

export default async function ProjectCalendarPage({
  searchParams,
}: PageProps<'/projects/calendar'>) {
  const user = await requireUser()
  const requested = monthSchema.safeParse(firstParam((await searchParams).month))
  const month = requested.success ? requested.data : currentMonth(user.timezone)
  return (
    <CachedView
      cacheKey={`/projects/calendar?month=${month}`}
      content={renderCalendar(user, month)}
      fallback={<PageSkeleton />}
    />
  )
}

async function renderCalendar(user: CurrentUser, month: string) {
  const thisMonth = currentMonth(user.timezone)
  const weeks = monthWeeks(month)
  const projects = await listOngoingInRange(user.id, weeks[0]![0]!, weeks.at(-1)![6]!)

  return (
    <ProjectDialogProvider>
      <PageHeader
        title="Projects"
        description="Ongoing work, laid out across the month."
        actions={
          <>
            <ProjectsViewSwitch current="calendar" />
            <NewProjectButton />
          </>
        }
        mobileActions={
          <>
            <ProjectsViewButton current="calendar" />
            <NewProjectButton variant="glass" />
          </>
        }
      />
      <div className="px-(--gutter) pb-4">
        <MonthNav
          month={month}
          current={thisMonth}
          hrefFor={(m) =>
            m === thisMonth ? '/projects/calendar' : `/projects/calendar?month=${m}`
          }
        />
      </div>
      {projects.length === 0 ? (
        <EmptyState
          className="border-t border-border md:mx-(--gutter) md:rounded-md md:border"
          title={`No ongoing projects in ${formatMonth(month)}`}
          description="Projects appear here once they’re ongoing with a start and end date."
        />
      ) : (
        <ProjectCalendar month={month} projects={projects} today={todayInTimeZone(user.timezone)} />
      )}
    </ProjectDialogProvider>
  )
}
