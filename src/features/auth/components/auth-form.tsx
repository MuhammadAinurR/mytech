'use client'

import { useActionState, useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useClientValidation } from '@/lib/use-client-validation'

import { loginAction, signupAction, type AuthFormState } from '../actions'
import { loginSchema, signupSchema } from '../schema'
import { PasswordInput } from './password-input'

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    undefined,
  )
  const validation = useClientValidation(loginSchema)
  const error = (name: string) => validation.errors[name]?.[0] ?? state?.fieldErrors?.[name]?.[0]

  return (
    <form
      action={formAction}
      noValidate
      onBlur={validation.onBlur}
      onChange={validation.onChange}
      onSubmit={validation.onSubmit}
      className="flex flex-col gap-5"
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label="Email" required error={error('email')}>
        <Input
          name="email"
          type="email"
          size="lg"
          autoComplete="email"
          autoFocus
          defaultValue={state?.values?.email}
        />
      </Field>
      <Field label="Password" required error={error('password')}>
        <PasswordInput name="password" size="lg" autoComplete="current-password" />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1 w-full">
        Sign in
      </Button>
    </form>
  )
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signupAction,
    undefined,
  )
  const validation = useClientValidation(signupSchema)
  const error = (name: string) => validation.errors[name]?.[0] ?? state?.fieldErrors?.[name]?.[0]
  // The browser's zone becomes the account default; it can be changed later.
  const timezone = useSyncExternalStore(noopSubscribe, browserTimeZone, () => 'UTC')

  return (
    <form
      action={formAction}
      noValidate
      onBlur={validation.onBlur}
      onChange={validation.onChange}
      onSubmit={validation.onSubmit}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="timezone" value={timezone} />
      <Field label="Name" required error={error('name')}>
        <Input
          name="name"
          size="lg"
          autoComplete="name"
          autoFocus
          defaultValue={state?.values?.name}
        />
      </Field>
      <Field label="Email" required error={error('email')}>
        <Input
          name="email"
          type="email"
          size="lg"
          autoComplete="email"
          defaultValue={state?.values?.email}
        />
      </Field>
      <Field label="Password" required hint="At least 10 characters." error={error('password')}>
        <PasswordInput name="password" size="lg" autoComplete="new-password" />
      </Field>
      <FormError message={state?.error} />
      <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-1 w-full">
        Create account
      </Button>
    </form>
  )
}

const noopSubscribe = () => () => {}
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  )
}
