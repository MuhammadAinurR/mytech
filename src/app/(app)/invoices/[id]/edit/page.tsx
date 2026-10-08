import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GlassButton } from '@/components/ui/glass-button'
import { PageHeader } from '@/components/ui/page-header'
import { InvoiceEditor } from '@/features/invoices/components/invoice-editor'
import { companyOptions, editInvoiceDefaults } from '@/features/invoices/editor-data'
import { INVOICE_EDITOR_FORM } from '@/features/invoices/editor-shared'
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
        mobileActions={
          <GlassButton
            type="submit"
            form={INVOICE_EDITOR_FORM}
            variant="accent"
            aria-label="Save changes"
          >
            <Check />
          </GlassButton>
        }
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
