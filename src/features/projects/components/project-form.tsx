'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DialogBody, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented'
import { toast } from '@/components/ui/toaster'
import { applyFieldErrors } from '@/lib/forms'

import { createProjectAction, updateProjectAction } from '../actions'
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  projectFormSchema,
  type ProjectFormValues,
} from '../schema'

export function ProjectForm({
  projectId,
  defaultValues,
  onDone,
}: {
  projectId?: string
  defaultValues: ProjectFormValues
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors } = form.formState
  const status = useWatch({ control: form.control, name: 'status' })

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = projectId
        ? await updateProjectAction(projectId, values)
        : await createProjectAction(values)
      if (result.ok) {
        toast.success(projectId ? 'Project updated' : 'Project added')
        onDone()
      } else if (result.error === 'not_found') {
        toast.error('That project no longer exists.')
        onDone()
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('The project wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogBody className="flex flex-col gap-5">
        <Field label="Name" required error={errors.name?.message}>
          <Input autoFocus {...form.register('name')} />
        </Field>
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <SegmentedControl
              label="Status"
              className="self-start"
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value)
                // Re-check dates so "ongoing needs dates" shows right away.
                if (form.formState.isSubmitted) void form.trigger(['startDate', 'endDate'])
              }}
              options={PROJECT_STATUSES.map((value) => ({
                value,
                label: PROJECT_STATUS_LABELS[value],
              }))}
            />
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
          <Field label="Start" required={status === 'ongoing'} error={errors.startDate?.message}>
            <Input type="date" {...form.register('startDate', { deps: ['endDate'] })} />
          </Field>
          <Field label="End" required={status === 'ongoing'} error={errors.endDate?.message}>
            <Input type="date" {...form.register('endDate', { deps: ['startDate'] })} />
          </Field>
        </div>
        <Field label="Description" error={errors.description?.message}>
          <Textarea rows={4} {...form.register('description')} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {projectId ? 'Save changes' : 'Add project'}
        </Button>
      </DialogFooter>
    </form>
  )
}
