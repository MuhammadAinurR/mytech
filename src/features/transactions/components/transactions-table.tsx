'use client'

import { Copy, Ellipsis, Pencil, Repeat, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Money } from '@/components/money'
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
import { Tooltip } from '@/components/ui/tooltip'
import { formatDateOnly } from '@/lib/dates'
import type { TransactionItem } from '@/server/queries/transactions'

import { deleteTransactionAction } from '../actions'
import { useTransactionDialog } from './transaction-dialog'

export function TransactionsTable({
  items,
  currentYear,
}: {
  items: TransactionItem[]
  currentYear: string
}) {
  const { openEdit, openDuplicate } = useTransactionDialog()
  const [deleting, setDeleting] = useState<TransactionItem | null>(null)

  async function confirmDelete() {
    if (!deleting) return
    const result = await deleteTransactionAction(deleting.id)
    if (result.ok) toast.success('Transaction deleted')
    else toast.error('That transaction no longer exists.')
  }

  return (
    <>
      <KeyboardRows label="Transactions">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 sm:w-24">Date</TableHead>
              <TableHead className="w-full lg:w-1/3">Category</TableHead>
              <TableHead className="hidden lg:table-cell">Note</TableHead>
              <TableHead numeric>Amount</TableHead>
              <TableHead className="hidden w-14 sm:table-cell">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                data-row
                className="cursor-pointer"
                onClick={(event) => {
                  // React events bubble through portals: ignore clicks from the row's
                  // menu (rendered in <body>) and from its own buttons.
                  const target = event.target as HTMLElement
                  if (!event.currentTarget.contains(target) || target.closest('button, a')) return
                  openEdit(item)
                }}
              >
                <TableCell className="tabular whitespace-nowrap text-muted">
                  {formatDateOnly(item.occurredOn, {
                    style: item.occurredOn.startsWith(currentYear) ? 'short' : 'medium',
                  })}
                </TableCell>
                <TableCell className="max-w-0 py-2.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <button
                      type="button"
                      data-row-link
                      tabIndex={-1}
                      onClick={() => openEdit(item)}
                      className="block min-w-0 cursor-pointer truncate text-left font-medium"
                    >
                      {item.category}
                    </button>
                    {item.recurringRuleId ? (
                      <Tooltip content="Created by a recurring rule">
                        <Repeat
                          aria-label="Recurring"
                          className="size-3.5 shrink-0 text-subtle"
                          tabIndex={-1}
                        />
                      </Tooltip>
                    ) : null}
                  </span>
                  {item.note ? (
                    <p className="truncate text-xs text-muted lg:hidden">{item.note}</p>
                  ) : null}
                </TableCell>
                <TableCell className="hidden max-w-0 text-muted lg:table-cell">
                  <span className="block truncate">{item.note}</span>
                </TableCell>
                <TableCell numeric className="sm:w-36">
                  <Money
                    amountMinor={item.type === 'income' ? item.amountMinor : -item.amountMinor}
                    currency={item.currency}
                    signed
                    tone={item.type === 'income' ? 'positive' : 'neutral'}
                  />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <RowActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Actions for ${item.category}`}
                        >
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => openEdit(item)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openDuplicate(item)}>
                          <Copy />
                          Duplicate
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
        title="Delete this transaction?"
        description="It will be removed from your history and monthly totals."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </>
  )
}
