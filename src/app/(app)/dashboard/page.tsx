import type { Metadata } from 'next'

import { PageHeader } from '@/components/ui/page-header'
import { formatDateOnly, todayInTimeZone } from '@/lib/dates'
import { requireUser } from '@/server/auth/session'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await requireUser()
  const today = todayInTimeZone(user.timezone)
  return <PageHeader title="Dashboard" description={formatDateOnly(today, { style: 'long' })} />
}
