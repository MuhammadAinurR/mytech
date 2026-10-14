import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LandingPage } from '@/features/landing/components/landing-page'
import { getCurrentUser } from '@/server/auth/session'

export const metadata: Metadata = {
  description:
    'Workbench is the admin side of independent work: money in and out, invoices with their own numbering and PDFs, due-date reminders, projects, and encrypted credentials.',
}

export default async function HomePage() {
  // Signed-in visits go straight to the app, like before the landing page.
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')
  return <LandingPage />
}
