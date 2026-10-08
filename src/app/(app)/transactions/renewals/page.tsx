import type { Metadata } from 'next'
import Link from 'next/link'

import { CachedView } from '@/components/app-shell/cached-view'
import { PageSkeleton } from '@/components/page-skeleton'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { UpcomingList } from '@/features/recurring/components/upcoming-list'
import { TransactionsTabs } from '@/features/transactions/components/transactions-tabs'
import { todayInTimeZone } from '@/lib/dates'
import { requireUser } from '@/server/auth/session'
import { listUpcoming } from '@/server/queries/recurring'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Renewals' }

const HORIZON_DAYS = 90

export default async function RenewalsPage() {
  const user = await requireUser()
  return (
    <CachedView
      cacheKey="/transactions/renewals"
      content={renderRenewals(user)}
      fallback={<PageSkeleton />}
    />
  )
}

async function renderRenewals(user: CurrentUser) {
  const today = todayInTimeZone(user.timezone)
  const upcoming = await listUpcoming(user.id, today, HORIZON_DAYS)

  return (
    <>
      <PageHeader
        title="Transactions"
        description={`Everything your rules will create in the next ${HORIZON_DAYS} days.`}
        className="pb-4"
      />
      <TransactionsTabs current="renewals" />
      {upcoming.length > 0 ? (
        <div className="pt-2 max-md:pt-5">
          <UpcomingList items={upcoming} />
        </div>
      ) : (
        <EmptyState
          title={`Nothing scheduled in the next ${HORIZON_DAYS} days`}
          description="Renewals appear here once you add a recurring rule."
          action={
            <Button asChild size="sm">
              <Link href="/transactions/recurring?new=1">New rule</Link>
            </Button>
          }
        />
      )}
    </>
  )
}
