import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CachedView } from '@/components/app-shell/cached-view'
import { PageSkeleton } from '@/components/page-skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { InvoiceActions } from '@/features/invoices/components/invoice-actions'
import { InvoiceDocument } from '@/features/invoices/components/invoice-document'
import { InvoiceStatusDot } from '@/features/invoices/components/invoice-status'
import { formatDateTime, todayInTimeZone } from '@/lib/dates'
import { uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { getInvoice } from '@/server/queries/invoices'
import type { CurrentUser } from '@/server/queries/users'

export async function generateMetadata({ params }: PageProps<'/invoices/[id]'>): Promise<Metadata> {
  const user = await requireUser()
  const id = uuidSchema.safeParse((await params).id)
  const invoice = id.success ? await getInvoice(user.id, id.data) : null
  return { title: invoice ? invoice.numberLabel : 'Invoice' }
}

export default async function InvoicePage({ params }: PageProps<'/invoices/[id]'>) {
  const user = await requireUser()
  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) notFound()
  return (
    <CachedView
      cacheKey={`/invoices/${id.data}`}
      content={renderInvoice(user, id.data)}
      fallback={<PageSkeleton rows={6} />}
    />
  )
}

async function renderInvoice(user: CurrentUser, id: string) {
  const invoice = await getInvoice(user.id, id)
  if (!invoice) notFound()
  const today = todayInTimeZone(user.timezone)

  const history = [
    invoice.sentAt ? `Sent ${formatDateTime(invoice.sentAt, user.timezone)}` : null,
    invoice.paidAt ? `Paid ${formatDateTime(invoice.paidAt, user.timezone)}` : null,
  ].filter(Boolean)

  return (
    <>
      <PageHeader
        back={{ href: '/invoices', label: 'Invoices' }}
        descriptionOnMobile
        title={<span className="font-mono">{invoice.numberLabel}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-fg">{invoice.clientName}</span>
            <InvoiceStatusDot status={invoice.status} dueDate={invoice.dueDate} today={today} />
            {history.length > 0 ? <span>{history.join(' · ')}</span> : null}
          </span>
        }
        actions={
          <InvoiceActions id={invoice.id} status={invoice.status} label={invoice.numberLabel} />
        }
      />
      <div className="border-t border-border bg-background px-0 py-0 sm:px-(--gutter) sm:py-10">
        <InvoiceDocument
          invoice={invoice}
          className="mx-auto max-w-3xl sm:rounded-md sm:border sm:border-border"
        />
      </div>
    </>
  )
}
