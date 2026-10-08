import { Building2, Check } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { GlassButton } from '@/components/ui/glass-button'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { InvoiceEditor } from '@/features/invoices/components/invoice-editor'
import { companyOptions, newInvoiceDefaults } from '@/features/invoices/editor-data'
import { INVOICE_EDITOR_FORM } from '@/features/invoices/editor-shared'
import { firstParam } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'

export const metadata: Metadata = { title: 'New invoice' }

export default async function NewInvoicePage({ searchParams }: PageProps<'/invoices/new'>) {
  const user = await requireUser()
  const companies = await companyOptions(user.id)
  const params = await searchParams
  const preferred = { companyId: firstParam(params.company), clientId: firstParam(params.client) }

  return (
    <>
      <PageHeader
        back={{ href: '/invoices', label: 'Invoices', mobileOnly: true }}
        mobileActions={
          companies.length > 0 ? (
            <GlassButton
              type="submit"
              form={INVOICE_EDITOR_FORM}
              variant="accent"
              aria-label="Save draft"
            >
              <Check />
            </GlassButton>
          ) : undefined
        }
        title="New invoice"
        description="Saved as a draft. You can edit it until it is sent."
      />
      {companies.length === 0 ? (
        <EmptyState
          className="border-t border-border"
          icon={<Building2 />}
          title="Add a company first"
          description="Invoices are issued from one of your companies, which sets their details and numbering."
          action={
            <Button asChild size="sm">
              <Link href="/companies?new=1">Add company</Link>
            </Button>
          }
        />
      ) : (
        <InvoiceEditor
          companies={companies}
          defaultValues={newInvoiceDefaults(user, companies, preferred)}
        />
      )}
    </>
  )
}
