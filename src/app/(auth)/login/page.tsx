import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LoginForm } from '@/features/auth/components/auth-form'
import { safeNextPath } from '@/features/auth/schema'
import { getCurrentUser } from '@/server/auth/session'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { next } = await searchParams
  const destination = safeNextPath(next)
  if (await getCurrentUser()) redirect(destination)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-base text-pretty text-muted">
          Money, renewals, credentials, invoices, and projects in one place.
        </p>
      </div>
      <LoginForm next={destination === '/dashboard' ? undefined : destination} />
      <p className="text-sm text-muted">
        New to Workbench?{' '}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
