import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { PageHeader } from '@/components/ui/page-header'
import { InvoiceEditor } from '@/features/invoices/components/invoice-editor'
import { companyOptions, editInvoiceDefaults } from '@/features/invoices/editor-data'
import { uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { getInvoice } from '@/server/queries/invoices'

export const metadata: Metadata = { title: 'Edit invoice' }

export default async function EditInvoicePage({ params }: PageProps<'/invoices/[id]/edit'>) {
  const user = await requireUser()
  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) notFound()
  const [invoice, companies] = await Promise.all([
    getInvoice(user.id, id.data),
    companyOptions(user.id),
  ])
  if (!invoice) notFound()
  if (invoice.status !== 'draft') redirect(`/invoices/${invoice.id}`)

  return (
    <>
      <PageHeader
        back={{ href: `/invoices/${invoice.id}`, label: invoice.numberLabel, mobileOnly: true }}
        title={`Edit ${invoice.numberLabel}`}
        description={`Draft for ${invoice.clientName}`}
      />
      <InvoiceEditor
        invoiceId={invoice.id}
        companies={companies}
        defaultValues={editInvoiceDefaults(invoice)}
      />
    </>
  )
}
