'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Select } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { applyFieldErrors } from '@/lib/forms'
import { CURRENCIES } from '@/lib/money'

import { updateProfileAction } from '../actions'
import { profileSchema, type ProfileInput } from '../schema'

export function ProfileForm({
  email,
  defaultValues,
  timeZones,
}: {
  email: string
  defaultValues: ProfileInput
  timeZones: { value: string; label: string }[]
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors, isDirty } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = await updateProfileAction(values)
      if (result.ok) {
        form.reset(values)
        toast.success('Profile saved')
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('Your profile wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <Field label="Name" required error={errors.name?.message}>
        <Input autoComplete="name" {...form.register('name')} />
      </Field>
      <Field label="Email" required hint="Used to sign in. It can’t be changed yet.">
        <Input value={email} readOnly disabled />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Field
          label="Timezone"
          required
          hint="Sets “today” for due dates and recurring entries."
          error={errors.timezone?.message}
        >
          <Select {...form.register('timezone')}>
            {timeZones.map((zone) => (
              <option key={zone.value} value={zone.value}>
                {zone.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Default currency" required error={errors.defaultCurrency?.message}>
          <Select {...form.register('defaultCurrency')}>
            {CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <Button type="submit" variant="primary" loading={pending} disabled={!isDirty}>
          Save profile
        </Button>
      </div>
    </form>
  )
}
