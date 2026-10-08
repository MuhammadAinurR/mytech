'use client'

import { CheckCheck, Ellipsis, FileDown, Pencil, Printer, Send, Trash2, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GlassButton } from '@/components/ui/glass-button'

import { type InvoiceStatus } from '../schema'
import { DeleteDraftDialog, useInvoiceMove } from './invoice-actions'

/**
 * Phones: every invoice action behind one glass "…" in the title bar (print,
 * PDF, edit, status, delete). The status's primary action also shows as a
 * full-width button under the title (InvoicePrimaryAction).
 */
export function InvoiceMobileMenu({
  id,
  status,
  label,
}: {
  id: string
  status: InvoiceStatus
  label: string
}) {
  const { move } = useInvoiceMove(id)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <GlassButton aria-label="Invoice actions">
            <Ellipsis />
          </GlassButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/invoices/${id}/print`} target="_blank" rel="noopener">
              <Printer />
              Print
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`/api/invoices/${id}/pdf`} download>
              <FileDown />
              Download PDF
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {status === 'draft' ? (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/invoices/${id}/edit`}>
                  <Pencil />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => move('paid')}>
                <CheckCheck />
                Mark as paid
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger" onSelect={() => setConfirmDelete(true)}>
                <Trash2 />
                Delete draft
              </DropdownMenuItem>
            </>
          ) : status === 'sent' ? (
            <DropdownMenuItem onSelect={() => move('draft')}>
              <Undo2 />
              Move back to draft
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => move('sent')}>
              <Undo2 />
              Mark as unpaid
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDraftDialog
        id={id}
        label={label}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
      />
    </>
  )
}

/** Phones: the status's next step as a full-width button (none once paid). */
export function InvoicePrimaryAction({ id, status }: { id: string; status: InvoiceStatus }) {
  const { pending, move } = useInvoiceMove(id)
  if (status === 'paid') return null
  return (
    <div className="px-4 pb-5 md:hidden">
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={pending}
        onClick={() => move(status === 'draft' ? 'sent' : 'paid')}
      >
        {status === 'draft' ? <Send /> : <CheckCheck />}
        {status === 'draft' ? 'Mark as sent' : 'Mark as paid'}
      </Button>
    </div>
  )
}
