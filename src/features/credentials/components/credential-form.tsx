'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DialogBody, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented'
import { toast } from '@/components/ui/toaster'
import { PasswordInput } from '@/features/auth/components/password-input'
import { applyFieldErrors } from '@/lib/forms'

import { createCredentialAction, updateCredentialAction } from '../actions'
import {
  CREDENTIAL_TYPE_LABELS,
  CREDENTIAL_TYPES,
  credentialCreateSchema,
  credentialUpdateSchema,
  type CredentialFormValues,
} from '../schema'

export function CredentialForm({
  credentialId,
  defaultValues,
  onDone,
}: {
  credentialId?: string
  defaultValues: CredentialFormValues
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const editing = Boolean(credentialId)
  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(editing ? credentialUpdateSchema : credentialCreateSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = credentialId
        ? await updateCredentialAction(credentialId, values)
        : await createCredentialAction(values)
      if (result.ok) {
        toast.success(editing ? 'Credential updated' : 'Credential saved')
        onDone()
      } else if (result.error === 'not_found') {
        toast.error('That credential no longer exists.')
        onDone()
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('The credential wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate autoComplete="off">
      <DialogBody className="flex flex-col gap-5">
        <Field label="Name" required error={errors.label?.message}>
          <Input autoFocus placeholder="Production database" {...form.register('label')} />
        </Field>
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <SegmentedControl
              label="Type"
              className="self-start"
              value={field.value}
              onValueChange={field.onChange}
              options={CREDENTIAL_TYPES.map((type) => ({
                value: type,
                label: CREDENTIAL_TYPE_LABELS[type],
              }))}
            />
          )}
        />
        <Field label="Host or URL" error={errors.host?.message}>
          <Input
            placeholder="db.example.com or https://registrar.example"
            className="font-mono"
            spellCheck={false}
            {...form.register('host')}
          />
        </Field>
        <Field label="Username" error={errors.username?.message}>
          <Input spellCheck={false} {...form.register('username')} />
        </Field>
        <Field
          label="Secret"
          required={!editing}
          hint={
            editing
              ? 'Leave blank to keep the current secret.'
              : 'Encrypted before it is saved. Only you can reveal it.'
          }
          error={errors.secret?.message}
        >
          <PasswordInput
            autoComplete="new-password"
            className="font-mono"
            spellCheck={false}
            placeholder={editing ? '••••••••••••' : undefined}
            {...form.register('secret')}
          />
        </Field>
        <Field
          label="Notes"
          hint="Notes are not encrypted. Keep passwords and keys in the secret field."
          error={errors.notes?.message}
        >
          <Textarea rows={3} {...form.register('notes')} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {editing ? 'Save changes' : 'Save credential'}
        </Button>
      </DialogFooter>
    </form>
  )
}
