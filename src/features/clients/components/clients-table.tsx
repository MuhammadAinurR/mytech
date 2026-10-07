'use client'

import { Ellipsis, FilePlus, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
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
import type { Client } from '@/server/queries/clients'

import { deleteClientAction } from '../actions'
import { useClientDialog } from './client-dialog'

export function ClientsTable({ clients }: { clients: Client[] }) {
  const { openEdit } = useClientDialog()
  const [deleting, setDeleting] = useState<Client | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    const result = await deleteClientAction(deleting.id)
    if (result.ok) toast.success('Client deleted')
    else toast.error('That client no longer exists.')
  }

  return (
    <>
      <KeyboardRows label="Clients">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full md:w-1/2 lg:w-1/3">Client</TableHead>
              <TableHead className="hidden md:table-cell">Address</TableHead>
              <TableHead className="hidden w-56 lg:table-cell">Tax ID</TableHead>
              <TableHead className="w-14">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id} data-row>
                <TableCell className="max-w-0 py-2.5">
                  <button
                    type="button"
                    data-row-link
                    tabIndex={-1}
                    onClick={() => openEdit(client)}
                    className="block max-w-full cursor-pointer truncate text-left font-medium"
                  >
                    {client.name}
                  </button>
                  <p className="truncate text-xs text-muted">
                    {client.email ?? <span className="text-subtle">No email</span>}
                  </p>
                </TableCell>
                <TableCell className="hidden max-w-0 truncate text-muted md:table-cell">
                  {/* First line only; the full address is in the dialog and on invoices. */}
                  {client.address?.split('\n')[0] ?? <span className="text-subtle">—</span>}
                </TableCell>
                <TableCell className="hidden font-mono text-sm whitespace-nowrap text-muted lg:table-cell">
                  {client.taxId ?? <span className="font-sans text-subtle">—</span>}
                </TableCell>
                <TableCell>
                  <RowActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Actions for ${client.name}`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/invoices/new?company=${client.companyId}&client=${client.id}`}
                          >
                            <FilePlus />
                            New invoice
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openEdit(client)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem tone="danger" onSelect={() => setDeleting(client)}>
                          <Trash2 />
                          Delete
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
        description="Invoices already issued to them keep their details."
        confirmLabel="Delete client"
        onConfirm={confirmDelete}
      />
    </>
  )
}
