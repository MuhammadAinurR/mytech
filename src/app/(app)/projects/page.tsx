import type { Metadata } from 'next'

import { CachedView } from '@/components/app-shell/cached-view'
import { PageSkeleton } from '@/components/page-skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { ProjectBoard } from '@/features/projects/components/project-board'
import {
  NewProjectButton,
  ProjectDialogProvider,
} from '@/features/projects/components/project-dialog'
import {
  ProjectsViewButton,
  ProjectsViewSwitch,
} from '@/features/projects/components/projects-view-switch'
import { todayInTimeZone } from '@/lib/dates'
import { requireUser } from '@/server/auth/session'
import { listProjects } from '@/server/queries/projects'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const user = await requireUser()
  return (
    <CachedView cacheKey="/projects" content={renderProjects(user)} fallback={<PageSkeleton />} />
  )
}

async function renderProjects(user: CurrentUser) {
  const projects = await listProjects(user.id)

  return (
    <ProjectDialogProvider>
      <PageHeader
        title="Projects"
        description="Drag cards between columns, or use a card’s menu to move it."
        actions={
          <>
            <ProjectsViewSwitch current="board" />
            <NewProjectButton />
          </>
        }
        mobileActions={
          <>
            <ProjectsViewButton current="board" />
            <NewProjectButton variant="glass" />
          </>
        }
      />
      <ProjectBoard projects={projects} today={todayInTimeZone(user.timezone)} />
    </ProjectDialogProvider>
  )
}
