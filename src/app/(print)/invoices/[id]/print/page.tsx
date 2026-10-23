import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InvoiceDocument } from '@/features/invoices/components/invoice-document'
import { PrintToolbar } from '@/features/invoices/components/print-toolbar'
import { firstParam, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { listInvoiceAttachments } from '@/server/queries/invoice-attachments'
import { getInvoice } from '@/server/queries/invoices'

export const metadata: Metadata = { title: 'Print invoice' }

export default async function PrintInvoicePage({
  params,
  searchParams,
}: PageProps<'/invoices/[id]/print'>) {
  const user = await requireUser()
  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) notFound()
  const [invoice, attachments] = await Promise.all([
    getInvoice(user.id, id.data),
    listInvoiceAttachments(user.id, id.data),
  ])
  if (!invoice) notFound()

  return (
    <main className="pb-16 print:pb-0">
      <h1 className="sr-only">Print invoice {invoice.numberLabel}</h1>
      <PrintToolbar
        backHref={`/invoices/${invoice.id}`}
        pdfHref={`/api/invoices/${invoice.id}/pdf`}
        attachmentCount={attachments.length}
        autoPrint={firstParam((await searchParams).autoprint) === '1'}
      />
      <InvoiceDocument
        invoice={invoice}
        className="mx-auto max-w-3xl sm:rounded-md sm:border sm:border-border"
      />
    </main>
  )
}
