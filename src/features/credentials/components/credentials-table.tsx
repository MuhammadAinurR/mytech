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
import { formatRelativeTime } from '@/lib/dates'
import type { CredentialItem } from '@/server/queries/credentials'

import { deleteCredentialAction } from '../actions'
import { CREDENTIAL_TYPE_LABELS } from '../schema'
import { useCredentialDialog } from './credential-dialog'
import { SecretCell } from './secret-cell'

export function CredentialsTable({ items }: { items: CredentialItem[] }) {
  const { openEdit } = useCredentialDialog()
  const [deleting, setDeleting] = useState<CredentialItem | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    const result = await deleteCredentialAction(deleting.id)
    if (result.ok) toast.success('Credential deleted')
    else toast.error('That credential no longer exists.')
  }

  return (
    <>
      <KeyboardRows label="Credentials">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full md:w-1/4">Name</TableHead>
              <TableHead className="hidden w-24 lg:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell md:w-1/4">Host</TableHead>
              <TableHead className="w-20 text-right sm:w-56 sm:text-left">Secret</TableHead>
              <TableHead className="hidden w-32 xl:table-cell">Last viewed</TableHead>
              <TableHead className="hidden w-14 sm:table-cell">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} data-row>
                <TableCell className="max-w-0 py-2.5">
                  <button
                    type="button"
                    data-row-link
                    tabIndex={-1}
                    onClick={() => openEdit(item)}
                    className="block max-w-full cursor-pointer truncate text-left font-medium"
                  >
                    {item.label}
                  </button>
                  <p className="truncate text-xs text-muted">
                    <span className="lg:hidden">{CREDENTIAL_TYPE_LABELS[item.type]}</span>
                    {item.username ? (
                      <>
                        <span className="lg:hidden"> · </span>
                        <span className="font-mono">{item.username}</span>
                      </>
                    ) : null}
                  </p>
                </TableCell>
                <TableCell className="hidden text-muted lg:table-cell">
                  {CREDENTIAL_TYPE_LABELS[item.type]}
                </TableCell>
                <TableCell className="hidden max-w-0 md:table-cell">
                  <span className="block truncate font-mono text-sm text-muted">
                    {item.host ?? '—'}
                  </span>
                </TableCell>
                <TableCell className="max-w-0">
                  <SecretCell credentialId={item.id} label={item.label} />
                </TableCell>
                <TableCell className="hidden text-sm whitespace-nowrap text-muted xl:table-cell">
                  {item.lastRevealedAt ? formatRelativeTime(item.lastRevealedAt) : 'Never'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <RowActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Actions for ${item.label}`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => openEdit(item)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem tone="danger" onSelect={() => setDeleting(item)}>
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
        title={`Delete “${deleting?.label ?? ''}”?`}
        description="The encrypted secret is destroyed. This can’t be undone."
        confirmLabel="Delete credential"
        onConfirm={confirmDelete}
      />
    </>
  )
}
