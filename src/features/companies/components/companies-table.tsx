'use client'

import { Ellipsis, FilePlus, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InsetLinkRow, InsetSection } from '@/components/ui/inset-list'
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
      {/* Phones: an inset list with the invoice count, long-press for more. */}
      <div data-grouped className="pb-6 md:hidden">
        <InsetSection>
          {companies.map((company) => (
            <ContextMenu key={company.id}>
              <ContextMenuTrigger asChild>
                <InsetLinkRow
                  href={`/companies/${company.id}`}
                  leading={<CompanyLogo company={company} />}
                  title={company.name}
                  subtitle={company.email ?? company.taxId ?? undefined}
                  trailing={
                    <span
                      className="text-muted"
                      aria-label={`${company.invoiceCount} ${company.invoiceCount === 1 ? 'invoice' : 'invoices'}`}
                    >
                      {company.invoiceCount}
                    </span>
                  }
                />
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem asChild>
                  <Link href={`/invoices/new?company=${company.id}`}>
                    <FilePlus />
                    New invoice
                  </Link>
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => openEdit(company)}>
                  <Pencil />
                  Edit
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  tone="danger"
                  disabled={company.invoiceCount > 0}
                  onSelect={() => setDeleting(company)}
                >
                  <Trash2 />
                  {company.invoiceCount > 0 ? 'Has invoices' : 'Delete'}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </InsetSection>
      </div>
      <div className="max-md:hidden">
        <KeyboardRows label="Companies">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-full md:w-2/5">Company</TableHead>
                <TableHead className="hidden md:table-cell">Next number</TableHead>
                <TableHead className="hidden w-24 sm:table-cell">Currency</TableHead>
                <TableHead numeric className="hidden w-24 sm:table-cell">
                  Clients
                </TableHead>
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
                <TableRow key={company.id} data-row className="relative">
                  <TableCell className="max-w-0 py-2.5">
                    <div className="flex items-center gap-3">
                      <CompanyLogo company={company} />
                      <div className="min-w-0">
                        <Link
                          href={`/companies/${company.id}`}
                          data-row-link
                          tabIndex={-1}
                          className="block max-w-full truncate font-medium after:absolute after:inset-0 after:content-['']"
                        >
                          {company.name}
                        </Link>
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
                  <TableCell numeric className="hidden sm:table-cell">
                    <span className={company.clientCount > 0 ? undefined : 'text-subtle'}>
                      {company.clientCount}
                    </span>
                  </TableCell>
                  <TableCell numeric>
                    <span className={company.invoiceCount > 0 ? undefined : 'text-subtle'}>
                      {company.invoiceCount}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {/* Above the row's stretched link, so the menu stays clickable. */}
                    <RowActions className="relative z-10">
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
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/new?company=${company.id}`}>
                              <FilePlus />
                              New invoice
                            </Link>
                          </DropdownMenuItem>
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
      </div>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? null : setDeleting(null))}
        title={`Delete “${deleting?.name ?? ''}”?`}
        description={
          deleting && deleting.clientCount > 0
            ? `It has no invoices. Its ${deleting.clientCount === 1 ? 'saved client is' : `${deleting.clientCount} saved clients are`} deleted too.`
            : 'It has no invoices, so nothing else is affected.'
        }
        confirmLabel="Delete company"
        onConfirm={confirmDelete}
      />
    </>
  )
}
