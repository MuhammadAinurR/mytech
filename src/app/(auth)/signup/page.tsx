import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SignupForm } from '@/features/auth/components/auth-form'
import { getCurrentUser } from '@/server/auth/session'

export const metadata: Metadata = { title: 'Create account' }

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="text-base text-pretty text-muted">
          Your data stays scoped to you. Secrets are encrypted before they are stored.
        </p>
      </div>
      <SignupForm />
      <p className="text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
