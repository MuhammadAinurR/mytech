'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DialogBody, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { applyFieldErrors } from '@/lib/forms'

import { createClientAction, updateClientAction } from '../actions'
import { clientFormSchema, type ClientFormValues } from '../schema'

export function ClientForm({
  companyId,
  clientId,
  defaultValues,
  onDone,
}: {
  companyId: string
  clientId?: string
  defaultValues: ClientFormValues
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = clientId
        ? await updateClientAction(clientId, values)
        : await createClientAction(companyId, values)
      if (result.ok) {
        toast.success(clientId ? 'Client updated' : 'Client added')
        onDone()
      } else if (result.error === 'not_found' || result.error === 'company_not_found') {
        toast.error(
          result.error === 'not_found'
            ? 'That client no longer exists.'
            : 'That company no longer exists.',
        )
        onDone()
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('The client wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogBody className="flex flex-col gap-5">
        <Field label="Name" required error={errors.name?.message}>
          <Input autoFocus autoComplete="off" {...form.register('name')} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <Textarea rows={3} autoComplete="off" {...form.register('address')} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" autoComplete="off" {...form.register('email')} />
          </Field>
          <Field label="Tax ID" error={errors.taxId?.message}>
            <Input className="font-mono" spellCheck={false} {...form.register('taxId')} />
          </Field>
        </div>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {clientId ? 'Save changes' : 'Add client'}
        </Button>
      </DialogFooter>
    </form>
  )
}
