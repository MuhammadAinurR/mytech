'use client'

import { Pencil, Plus } from 'lucide-react'
import { createContext, useContext, type ReactNode } from 'react'

import { useEntityDialog } from '@/components/use-entity-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogHeader } from '@/components/ui/dialog'
import type { Company } from '@/server/queries/companies'

import { CompanyForm } from './company-form'
import { LogoUploader } from './logo-uploader'

const CompanyDialogContext = createContext<{
  openCreate: () => void
  openEdit: (company: Company) => void
} | null>(null)

export function useCompanyDialog() {
  const context = useContext(CompanyDialogContext)
  if (!context) throw new Error('useCompanyDialog must be used inside its provider')
  return context
}

export function CompanyDialogProvider({
  children,
  companies,
  defaultCurrency,
  openFromUrl = true,
}: {
  children: ReactNode
  /** Fresh list from the server, so the open dialog reflects updates (e.g. a new logo). */
  companies: Company[]
  defaultCurrency: string
  /** Whether `?new=1` opens "New company" (not on a page where it means something else). */
  openFromUrl?: boolean
}) {
  const dialog = useEntityDialog<Company>({ openFromUrl })
  const company = dialog.item
    ? (companies.find((candidate) => candidate.id === dialog.item?.id) ?? dialog.item)
    : null

  return (
    <CompanyDialogContext value={dialog}>
      {children}
      <Dialog open={dialog.open} onOpenChange={(open) => (open ? null : dialog.close())}>
        <DialogContent size="lg">
          <DialogHeader
            title={company ? 'Edit company' : 'New company'}
            description={
              company
                ? 'Changes apply to invoices you create from now on.'
                : 'Invoices issued from this company use its details and numbering. You can add a logo after saving.'
            }
          />
          {company ? (
            <DialogBody className="border-b border-border pb-5">
              <LogoUploader company={company} />
            </DialogBody>
          ) : null}
          <CompanyForm
            key={company?.id ?? 'new'}
            companyId={company?.id}
            defaultValues={{
              name: company?.name ?? '',
              address: company?.address ?? '',
              taxId: company?.taxId ?? '',
              email: company?.email ?? '',
              defaultCurrency: (company?.defaultCurrency ?? defaultCurrency) as 'USD',
              paymentDetails: company?.paymentDetails ?? '',
              invoicePrefix: company?.invoicePrefix ?? 'INV-',
              nextInvoiceNumber: String(company?.nextInvoiceNumber ?? 1),
            }}
            onDone={dialog.close}
          />
        </DialogContent>
      </Dialog>
    </CompanyDialogContext>
  )
}

export function AddCompanyButton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const { openCreate } = useCompanyDialog()
  return (
    <Button variant={variant} size={variant === 'primary' ? 'md' : 'sm'} onClick={openCreate}>
      <Plus />
      Add company
    </Button>
  )
}

export function EditCompanyButton({ company }: { company: Company }) {
  const { openEdit } = useCompanyDialog()
  return (
    <Button variant="secondary" onClick={() => openEdit(company)}>
      <Pencil />
      Edit company
    </Button>
  )
}
