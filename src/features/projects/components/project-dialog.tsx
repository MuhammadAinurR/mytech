'use client'

import { Plus } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'

import { useEntityDialog } from '@/components/use-entity-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import type { ProjectItem } from '@/server/queries/projects'

import { type ProjectStatus } from '../schema'
import { ProjectForm } from './project-form'

const ProjectDialogContext = createContext<{
  openCreate: (status?: ProjectStatus) => void
  openEdit: (project: ProjectItem) => void
} | null>(null)

export function useProjectDialog() {
  const context = useContext(ProjectDialogContext)
  if (!context) throw new Error('useProjectDialog must be used inside its provider')
  return context
}

export function ProjectDialogProvider({ children }: { children: ReactNode }) {
  const dialog = useEntityDialog<ProjectItem>()
  const [initialStatus, setInitialStatus] = useState<ProjectStatus>('todo')
  const project = dialog.item

  const value = {
    openCreate: (status: ProjectStatus = 'todo') => {
      setInitialStatus(status)
      dialog.openCreate()
    },
    openEdit: dialog.openEdit,
  }

  return (
    <ProjectDialogContext value={value}>
      {children}
      <Dialog open={dialog.open} onOpenChange={(open) => (open ? null : dialog.close())}>
        <DialogContent size="md">
          <DialogHeader
            title={project ? 'Edit project' : 'New project'}
            description={project ? undefined : 'Ongoing projects need a start and end date.'}
          />
          <ProjectForm
            key={project?.id ?? `new-${initialStatus}`}
            projectId={project?.id}
            defaultValues={{
              name: project?.name ?? '',
              description: project?.description ?? '',
              status: project?.status ?? initialStatus,
              startDate: project?.startDate ?? '',
              endDate: project?.endDate ?? '',
            }}
            onDone={dialog.close}
          />
        </DialogContent>
      </Dialog>
    </ProjectDialogContext>
  )
}

export function NewProjectButton() {
  const { openCreate } = useProjectDialog()
  return (
    <Button variant="primary" onClick={() => openCreate()}>
      <Plus />
      New project
    </Button>
  )
}
