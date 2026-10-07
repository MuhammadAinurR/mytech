import type { Metadata } from 'next'
import Link from 'next/link'

import { CachedView } from '@/components/app-shell/cached-view'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { MonthNav } from '@/components/month-nav'
import { MonthSummary } from '@/features/transactions/components/month-summary'
import {
  AddTransactionButton,
  TransactionDialogProvider,
} from '@/features/transactions/components/transaction-dialog'
import { TransactionsSkeleton } from '@/features/transactions/components/transactions-skeleton'
import { TransactionsTable } from '@/features/transactions/components/transactions-table'
import { TransactionsTabs } from '@/features/transactions/components/transactions-tabs'
import { TransactionsToolbar } from '@/features/transactions/components/transactions-toolbar'
import {
  transactionListQuerySchema,
  type TransactionListQuery,
} from '@/features/transactions/schema'
import { todayInTimeZone } from '@/lib/dates'
import { currentMonth, formatMonth } from '@/lib/months'
import { withParams } from '@/lib/url'
import { requireUser } from '@/server/auth/session'
import { getMonthlySummary, listCategories, listTransactions } from '@/server/queries/transactions'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Transactions' }

export default async function TransactionsPage({ searchParams }: PageProps<'/transactions'>) {
  const user = await requireUser()
  const parsed = transactionListQuerySchema.parse(await searchParams)
  // No month means this month, so both URLs share one cache entry.
  const query = { ...parsed, month: parsed.month ?? currentMonth(user.timezone) }
  return (
    <CachedView
      cacheKey={withParams('/transactions', query)}
      content={renderTransactions(user, query)}
      fallback={<TransactionsSkeleton />}
    />
  )
}

async function renderTransactions(
  user: CurrentUser,
  query: TransactionListQuery & { month: string },
) {
  const today = todayInTimeZone(user.timezone)
  const thisMonth = currentMonth(user.timezone)
  const { month } = query

  const [list, summary, categories] = await Promise.all([
    listTransactions(user.id, { month, type: query.type, q: query.q, page: query.page }),
    getMonthlySummary(user.id, month),
    listCategories(user.id),
  ])

  const filters = { month, type: query.type, q: query.q }
  const href = (patch: Partial<typeof filters> & { page?: number }) =>
    withParams('/transactions', { ...filters, ...patch })
  const filtered = Boolean(query.type || query.q)

  return (
    <TransactionDialogProvider
      defaults={{
        currency: user.defaultCurrency,
        date: month === thisMonth ? today : `${month}-01`,
      }}
      categories={categories}
    >
      <PageHeader
        title="Transactions"
        description="Money in and out, month by month."
        actions={<AddTransactionButton />}
        className="pb-4"
      />
      <TransactionsTabs current="all" />
      <div className="px-(--gutter) pt-6 pb-3">
        <MonthNav
          month={month}
          current={thisMonth}
          hrefFor={(m) => href({ month: m, page: undefined })}
        />
      </div>
      <MonthSummary summary={summary} primaryCurrency={user.defaultCurrency} />
      <TransactionsToolbar
        filters={filters}
        hrefFor={(patch) => href({ ...patch, page: undefined })}
      />

      {list.items.length > 0 ? (
        <>
          <TransactionsTable items={list.items} currentYear={today.slice(0, 4)} />
          <Pagination
            page={list.page}
            pageSize={list.pageSize}
            total={list.total}
            hrefForPage={(page) => href({ page })}
          />
        </>
      ) : filtered ? (
        <EmptyState
          className="border-t border-border"
          title="Nothing matches these filters"
          description={`No ${query.type ?? ''} transactions${query.q ? ` matching “${query.q}”` : ''} in ${formatMonth(month)}.`.replace(
            /\s+/g,
            ' ',
          )}
          action={
            <Button asChild size="sm">
              <Link href={href({ type: undefined, q: undefined })}>Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          className="border-t border-border"
          title={`No transactions in ${formatMonth(month)}`}
          description="Record income or an expense to see this month’s totals."
          action={<AddTransactionButton variant="secondary" />}
        />
      )}
    </TransactionDialogProvider>
  )
}
