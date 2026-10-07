import { FileText, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Fragment } from 'react'

import { CachedView } from '@/components/app-shell/cached-view'
import { ListToolbar } from '@/components/list-toolbar'
import { Money } from '@/components/money'
import { PageSkeleton } from '@/components/page-skeleton'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Pagination } from '@/components/ui/pagination'
import { InvoicesTable } from '@/features/invoices/components/invoices-table'
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUSES,
  invoiceListQuerySchema,
  type InvoiceListQuery,
} from '@/features/invoices/schema'
import { todayInTimeZone } from '@/lib/dates'
import { withParams } from '@/lib/url'
import { requireUser } from '@/server/auth/session'
import { getReceivables, listInvoices } from '@/server/queries/invoices'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Invoices' }

export default async function InvoicesPage({ searchParams }: PageProps<'/invoices'>) {
  const user = await requireUser()
  const query = invoiceListQuerySchema.parse(await searchParams)
  return (
    <CachedView
      cacheKey={withParams('/invoices', query)}
      content={renderInvoices(user, query)}
      fallback={<PageSkeleton />}
    />
  )
}

async function renderInvoices(user: CurrentUser, query: InvoiceListQuery) {
  const today = todayInTimeZone(user.timezone)
  const [list, receivables] = await Promise.all([
    listInvoices(user.id, query),
    getReceivables(user.id, today),
  ])
  const href = (patch: { status?: string; q?: string; page?: number }) =>
    withParams('/invoices', { status: query.status, q: query.q, ...patch })
  const filtered = Boolean(query.status || query.q)

  const newInvoice = (variant: 'primary' | 'secondary' = 'primary') => (
    <Button asChild variant={variant} size={variant === 'primary' ? 'md' : 'sm'}>
      <Link href="/invoices/new">
        <Plus />
        New invoice
      </Link>
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Numbered per company. Drafts stay editable until sent."
        actions={newInvoice()}
      />

      {receivables.length > 0 ? (
        <div className="px-(--gutter) pb-6">
          <dl className="flex flex-wrap gap-x-10 gap-y-3 border-y border-border py-4">
            {receivables.map((row) => (
              <Fragment key={row.currency}>
                <div>
                  <dt className="text-xs text-muted">Outstanding · {row.currency}</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    <Money amountMinor={row.outstandingMinor} currency={row.currency} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Overdue · {row.currency}</dt>
                  <dd className="mt-1 text-lg font-semibold">
                    <Money
                      amountMinor={row.overdueMinor}
                      currency={row.currency}
                      tone={row.overdueMinor === 0 ? 'muted' : 'neutral'}
                    />
                    {row.overdueCount > 0 ? (
                      <span className="ml-2 text-sm font-normal text-danger">
                        {row.overdueCount} {row.overdueCount === 1 ? 'invoice' : 'invoices'}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </Fragment>
            ))}
          </dl>
        </div>
      ) : null}

      {list.total > 0 || filtered ? (
        <ListToolbar
          filterLabel="Filter by status"
          current={query.status}
          filters={[
            { value: undefined, label: 'All', href: href({ status: undefined }) },
            ...INVOICE_STATUSES.map((status) => ({
              value: status,
              label: INVOICE_STATUS_LABELS[status],
              href: href({ status }),
            })),
          ]}
          search={{
            action: '/invoices',
            placeholder: 'Search client or number',
            label: 'Search invoices',
            value: query.q,
            keep: { status: query.status },
            clearHref: href({ q: undefined }),
          }}
        />
      ) : null}

      {list.items.length > 0 ? (
        <>
          <InvoicesTable items={list.items} today={today} />
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
          title="Nothing matches"
          description="No invoices match these filters."
          action={
            <Button asChild size="sm">
              <Link href="/invoices">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          className="border-t border-border"
          icon={<FileText />}
          title="No invoices yet"
          description="Create one from a company; numbering and totals are handled for you."
          action={newInvoice('secondary')}
        />
      )}
    </>
  )
}
