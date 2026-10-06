'use client'

import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { KeyboardRows } from '@/components/ui/keyboard-rows'
import {
  RowActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toaster'
import { formatInvoiceNumber } from '@/features/invoices/lib/totals'
import type { CompanyWithCount } from '@/server/queries/companies'

import { deleteCompanyAction } from '../actions'
import { useCompanyDialog } from './company-dialog'
import { CompanyLogo } from './company-logo'

export function CompaniesTable({ companies }: { companies: CompanyWithCount[] }) {
  const { openEdit } = useCompanyDialog()
  const [deleting, setDeleting] = useState<CompanyWithCount | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    const result = await deleteCompanyAction(deleting.id)
    if (result.ok) toast.success('Company deleted')
    else if (result.error === 'has_invoices')
      toast.error('Companies with invoices can’t be deleted.')
    else toast.error('That company no longer exists.')
  }

  return (
    <>
      <KeyboardRows label="Companies">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full md:w-2/5">Company</TableHead>
              <TableHead className="hidden md:table-cell">Next number</TableHead>
              <TableHead className="hidden w-24 sm:table-cell">Currency</TableHead>
              <TableHead numeric className="w-24">
                Invoices
              </TableHead>
              <TableHead className="hidden w-14 sm:table-cell">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id} data-row>
                <TableCell className="max-w-0 py-2.5">
                  <div className="flex items-center gap-3">
                    <CompanyLogo company={company} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        data-row-link
                        tabIndex={-1}
                        onClick={() => openEdit(company)}
                        className="block max-w-full cursor-pointer truncate text-left font-medium"
                      >
                        {company.name}
                      </button>
                      <p className="truncate text-xs text-muted">
                        {company.email ?? company.taxId ?? '—'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden font-mono text-sm text-muted md:table-cell">
                  {formatInvoiceNumber(company.invoicePrefix, company.nextInvoiceNumber)}
                </TableCell>
                <TableCell className="hidden text-muted sm:table-cell">
                  {company.defaultCurrency}
                </TableCell>
                <TableCell numeric>
                  <span className={company.invoiceCount > 0 ? undefined : 'text-subtle'}>
                    {company.invoiceCount}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <RowActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Actions for ${company.name}`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => openEdit(company)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          tone="danger"
                          disabled={company.invoiceCount > 0}
                          onSelect={() => setDeleting(company)}
                        >
                          <Trash2 />
                          {company.invoiceCount > 0 ? 'Has invoices' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </RowActions>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </KeyboardRows>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? null : setDeleting(null))}
        title={`Delete “${deleting?.name ?? ''}”?`}
        description="It has no invoices, so nothing else is affected."
        confirmLabel="Delete company"
        onConfirm={confirmDelete}
      />
    </>
  )
}
