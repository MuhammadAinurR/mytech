'use client'

import { CheckCheck, Ellipsis, FileDown, Pencil, Printer, Send, Trash2, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toaster'

import { deleteInvoiceAction, setInvoiceStatusAction } from '../actions'
import { type InvoiceStatus } from '../schema'

const statusToast: Record<InvoiceStatus, string> = {
  draft: 'Moved back to draft',
  sent: 'Marked as sent',
  paid: 'Marked as paid',
}

/** The one primary action follows the invoice's status; everything else is secondary. */
export function InvoiceActions({
  id,
  status,
  label,
}: {
  id: string
  status: InvoiceStatus
  label: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)

  function move(next: InvoiceStatus) {
    startTransition(async () => {
      const result = await setInvoiceStatusAction(id, next)
      if (result.ok) toast.success(statusToast[next])
      else toast.error('That change isn’t possible from the current status.')
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="md">
        <Link href={`/invoices/${id}/print`} target="_blank" rel="noopener">
          <Printer />
          Print
        </Link>
      </Button>
      <Button asChild size="md">
        <a href={`/api/invoices/${id}/pdf`} download>
          <FileDown />
          PDF
        </a>
      </Button>
      {status === 'draft' ? (
        <Button variant="primary" loading={pending} onClick={() => move('sent')}>
          <Send />
          Mark as sent
        </Button>
      ) : status === 'sent' ? (
        <Button variant="primary" loading={pending} onClick={() => move('paid')}>
          <CheckCheck />
          Mark as paid
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" aria-label="More invoice actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
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
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete draft ${label}?`}
        description="The number stays used, so the next invoice keeps counting up."
        confirmLabel="Delete draft"
        onConfirm={async () => {
          const result = await deleteInvoiceAction(id)
          if (result.ok) {
            toast.success('Draft deleted')
            router.push('/invoices')
          } else {
            toast.error('Only drafts can be deleted.')
          }
        }}
      />
    </div>
  )
}
