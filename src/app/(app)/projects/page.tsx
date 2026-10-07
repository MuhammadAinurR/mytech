import type { Metadata } from 'next'

import { PageHeader } from '@/components/ui/page-header'
import { ProjectBoard } from '@/features/projects/components/project-board'
import {
  NewProjectButton,
  ProjectDialogProvider,
} from '@/features/projects/components/project-dialog'
import { todayInTimeZone } from '@/lib/dates'
import { requireUser } from '@/server/auth/session'
import { listProjects } from '@/server/queries/projects'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const user = await requireUser()
  const projects = await listProjects(user.id)

  return (
    <ProjectDialogProvider>
      <PageHeader
        title="Projects"
        description="Drag cards between columns, or use a card’s menu to move it."
        actions={<NewProjectButton />}
      />
      <ProjectBoard projects={projects} today={todayInTimeZone(user.timezone)} />
    </ProjectDialogProvider>
  )
}
