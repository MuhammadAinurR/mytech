'use client'

import { Copy, FileText, Pencil, Repeat, Trash2 } from 'lucide-react'
import Link from 'next/link'

import { Money } from '@/components/money'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { InsetButtonRow, InsetLinkRow, InsetSection } from '@/components/ui/inset-list'
import { addDays, formatDateOnly } from '@/lib/dates'
import type { TransactionItem } from '@/server/queries/transactions'

import { EntryDetail } from './entry-detail'
import { useTransactionDialog } from './transaction-dialog'

function dayLabel(date: string, today: string): string {
  if (date === today) return 'Today'
  if (date === addDays(today, -1)) return 'Yesterday'
  return formatDateOnly(date, { style: 'day' })
}

/**
 * Transactions on a phone: inset groups per day, newest first. Tap to edit;
 * long-press for Edit, Duplicate, and Delete (the table's row menu). An
 * invoice's payment opens its invoice instead, where it is changed.
 */
export function TransactionsList({ items, today }: { items: TransactionItem[]; today: string }) {
  const { openEdit, openDuplicate, askDelete } = useTransactionDialog()
  const days = new Map<string, TransactionItem[]>()
  for (const item of items) days.set(item.occurredOn, [...(days.get(item.occurredOn) ?? []), item])

  return (
    <div className="flex flex-col gap-6 md:hidden">
      {[...days].map(([date, rows]) => (
        <InsetSection key={date} title={dayLabel(date, today)}>
          {rows.map((item) => {
            const content = {
              title: (
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{item.category}</span>
                  {item.recurringRuleId ? (
                    <Repeat aria-label="Recurring" className="size-3.5 shrink-0 text-subtle" />
                  ) : null}
                  {item.invoiceId ? (
                    <FileText
                      aria-label="From an invoice"
                      className="size-3.5 shrink-0 text-subtle"
                    />
                  ) : null}
                </span>
              ),
              subtitle: item.note || item.invoiceNumber ? <EntryDetail item={item} /> : null,
              trailing: (
                <Money
                  amountMinor={item.type === 'income' ? item.amountMinor : -item.amountMinor}
                  currency={item.currency}
                  signed
                  tone={item.type === 'income' ? 'positive' : 'neutral'}
                />
              ),
            }
            return (
              <ContextMenu key={item.id}>
                <ContextMenuTrigger asChild>
                  {item.invoiceId ? (
                    <InsetLinkRow
                      href={`/invoices/${item.invoiceId}`}
                      chevron={false}
                      {...content}
                    />
                  ) : (
                    <InsetButtonRow onClick={() => openEdit(item)} {...content} />
                  )}
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {item.invoiceId ? (
                    <ContextMenuItem asChild>
                      <Link href={`/invoices/${item.invoiceId}`}>
                        <FileText />
                        Open invoice
                      </Link>
                    </ContextMenuItem>
                  ) : (
                    <>
                      <ContextMenuItem onSelect={() => openEdit(item)}>
                        <Pencil />
                        Edit
                      </ContextMenuItem>
                      <ContextMenuItem onSelect={() => openDuplicate(item)}>
                        <Copy />
                        Duplicate
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem tone="danger" onSelect={() => askDelete(item)}>
                        <Trash2 />
                        Delete
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </InsetSection>
      ))}
    </div>
  )
}
