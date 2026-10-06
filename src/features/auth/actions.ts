'use server'

import { redirect } from 'next/navigation'

import { type FieldErrors } from '@/lib/result'
import { fieldErrors, formString } from '@/lib/validation'
import { authenticate, registerUser } from '@/server/auth/service'
import { endSession, getRequestMeta, startSession } from '@/server/auth/session'

import { loginSchema, safeNextPath, signupSchema } from './schema'

export type AuthFormState =
  | { error?: string; fieldErrors?: FieldErrors; values?: { email?: string; name?: string } }
  | undefined

const RATE_LIMITED = 'Too many attempts. Wait a few minutes and try again.'

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formString(formData, 'email')
  const parsed = loginSchema.safeParse({ email, password: formString(formData, 'password') })
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values: { email } }

  const result = await authenticate(parsed.data, await getRequestMeta())
  if (!result.ok) {
    return {
      error:
        result.error === 'rate_limited' ? RATE_LIMITED : 'That email and password don’t match.',
      values: { email },
    }
  }

  await startSession(result.data.id)
  redirect(safeNextPath(formString(formData, 'next')))
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { name: formString(formData, 'name'), email: formString(formData, 'email') }
  const parsed = signupSchema.safeParse({
    ...values,
    password: formString(formData, 'password'),
    timezone: formString(formData, 'timezone'),
  })
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values }

  const result = await registerUser(parsed.data, await getRequestMeta())
  if (!result.ok) {
    return result.error === 'rate_limited'
      ? { error: RATE_LIMITED, values }
      : { fieldErrors: { email: ['An account with this email already exists.'] }, values }
  }

  await startSession(result.data.id)
  redirect('/dashboard')
}

export async function logoutAction(): Promise<void> {
  await endSession()
  redirect('/login')
}
