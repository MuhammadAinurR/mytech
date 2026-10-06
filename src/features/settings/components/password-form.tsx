'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { toast } from '@/components/ui/toaster'
import { PasswordInput } from '@/features/auth/components/password-input'
import { applyFieldErrors } from '@/lib/forms'

import { changePasswordAction } from '../actions'
import { passwordChangeSchema, type PasswordChangeInput } from '../schema'

export function PasswordForm() {
  const [pending, startTransition] = useTransition()
  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await changePasswordAction(values)
      if (result.ok) {
        form.reset()
        toast.success('Password changed. Other devices were signed out.')
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('Your password wasn’t changed. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field label="Current password" required error={errors.currentPassword?.message}>
        <PasswordInput autoComplete="current-password" {...form.register('currentPassword')} />
      </Field>
      <Field
        label="New password"
        required
        hint="At least 10 characters."
        error={errors.newPassword?.message}
      >
        <PasswordInput autoComplete="new-password" {...form.register('newPassword')} />
      </Field>
      <div>
        <Button type="submit" loading={pending}>
          Change password
        </Button>
      </div>
    </form>
  )
}
