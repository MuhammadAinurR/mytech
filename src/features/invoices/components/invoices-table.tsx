import Link from 'next/link'

import { Money } from '@/components/money'
import { InsetLinkRow, InsetSection } from '@/components/ui/inset-list'
import { KeyboardRows } from '@/components/ui/keyboard-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateOnly } from '@/lib/dates'
import type { InvoiceListItem } from '@/server/queries/invoices'

import { InvoiceStatusDot } from './invoice-status'

export function InvoicesTable({ items, today }: { items: InvoiceListItem[]; today: string }) {
  const year = today.slice(0, 4)
  const date = (value: string) =>
    formatDateOnly(value, { style: value.startsWith(year) ? 'short' : 'medium' })

  return (
    <>
      <div className="max-md:hidden">
        <KeyboardRows label="Invoices">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Number</TableHead>
                <TableHead className="w-full md:w-auto">Client</TableHead>
                <TableHead className="hidden w-28 md:table-cell">Issued</TableHead>
                <TableHead className="hidden w-28 sm:table-cell">Due</TableHead>
                <TableHead className="hidden w-28 sm:table-cell">Status</TableHead>
                <TableHead numeric>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((invoice) => (
                <TableRow key={invoice.id} data-row className="relative">
                  <TableCell className="font-mono text-sm whitespace-nowrap">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      data-row-link
                      tabIndex={-1}
                      className="after:absolute after:inset-0 after:content-['']"
                    >
                      {invoice.numberLabel}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-0 py-2.5">
                    <p className="truncate font-medium">{invoice.clientName}</p>
                    <p className="truncate text-xs text-muted">
                      {invoice.companyName}
                      <span className="sm:hidden">
                        {' · '}
                        <InvoiceStatusDot
                          status={invoice.status}
                          dueDate={invoice.dueDate}
                          today={today}
                        />
                      </span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden tabular whitespace-nowrap text-muted md:table-cell">
                    {date(invoice.issueDate)}
                  </TableCell>
                  <TableCell className="hidden tabular whitespace-nowrap text-muted sm:table-cell">
                    {date(invoice.dueDate)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <InvoiceStatusDot
                      status={invoice.status}
                      dueDate={invoice.dueDate}
                      today={today}
                    />
                  </TableCell>
                  <TableCell numeric className="sm:w-36">
                    <Money amountMinor={invoice.totalMinor} currency={invoice.currency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </KeyboardRows>
      </div>

      {/* Phones: one inset group; each row opens the invoice. */}
      <InsetSection className="md:hidden">
        {items.map((invoice) => (
          <InsetLinkRow
            key={invoice.id}
            href={`/invoices/${invoice.id}`}
            title={invoice.clientName}
            subtitle={
              <span className="flex items-center gap-2">
                <span className="font-mono">{invoice.numberLabel}</span>
                <InvoiceStatusDot status={invoice.status} dueDate={invoice.dueDate} today={today} />
              </span>
            }
            trailing={<Money amountMinor={invoice.totalMinor} currency={invoice.currency} />}
          />
        ))}
      </InsetSection>
    </>
  )
}
