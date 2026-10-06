import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InvoiceDocument } from '@/features/invoices/components/invoice-document'
import { PrintToolbar } from '@/features/invoices/components/print-toolbar'
import { firstParam, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { getInvoice } from '@/server/queries/invoices'

export const metadata: Metadata = { title: 'Print invoice' }

export default async function PrintInvoicePage({
  params,
  searchParams,
}: PageProps<'/invoices/[id]/print'>) {
  const user = await requireUser()
  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) notFound()
  const invoice = await getInvoice(user.id, id.data)
  if (!invoice) notFound()

  return (
    <main className="pb-16 print:pb-0">
      <PrintToolbar
        backHref={`/invoices/${invoice.id}`}
        autoPrint={firstParam((await searchParams).autoprint) === '1'}
      />
      <InvoiceDocument
        invoice={invoice}
        className="mx-auto max-w-3xl sm:rounded-md sm:border sm:border-border"
      />
    </main>
  )
}
