import { Money } from '@/components/money'
import { InsetRowStatic, InsetSection } from '@/components/ui/inset-list'
import { StatusDot } from '@/components/ui/status-dot'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { describeDaysUntil, formatDateOnly } from '@/lib/dates'
import { formatMonth, monthOf } from '@/lib/months'
import type { UpcomingOccurrence } from '@/server/queries/recurring'

/** Upcoming occurrences grouped by month, with reminder windows called out. */
export function UpcomingList({ items }: { items: UpcomingOccurrence[] }) {
  const groups = new Map<string, UpcomingOccurrence[]>()
  for (const item of items) {
    const month = monthOf(item.date)
    groups.set(month, [...(groups.get(month) ?? []), item])
  }

  return (
    <>
      <Table className="max-md:hidden">
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 sm:w-28">Date</TableHead>
            <TableHead className="w-full sm:w-auto">Name</TableHead>
            <TableHead className="hidden w-48 sm:table-cell">When</TableHead>
            <TableHead numeric>Amount</TableHead>
          </TableRow>
        </TableHeader>
        {[...groups.entries()].map(([month, occurrences]) => (
          <TableBody key={month}>
            <TableRow className="hover:bg-transparent">
              <th
                colSpan={4}
                scope="rowgroup"
                className="border-b border-border bg-background/50 px-(--gutter) py-2 text-left text-xs font-medium text-muted"
              >
                {formatMonth(month)}
              </th>
            </TableRow>
            {occurrences.map((item) => (
              <TableRow key={`${item.ruleId}-${item.date}`}>
                <TableCell className="tabular whitespace-nowrap">
                  {formatDateOnly(item.date, { style: 'short' })}
                </TableCell>
                <TableCell className="max-w-0 py-2.5">
                  <p className="truncate font-medium">{item.label}</p>
                  <p className="truncate text-xs text-muted">
                    {item.category}
                    <span className="sm:hidden"> · {describeDaysUntil(item.daysUntil)}</span>
                  </p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {item.dueSoon ? (
                    <StatusDot tone="warning">{describeDaysUntil(item.daysUntil)}</StatusDot>
                  ) : (
                    <span className="text-muted">{describeDaysUntil(item.daysUntil)}</span>
                  )}
                </TableCell>
                <TableCell numeric className="sm:w-36">
                  <Money
                    amountMinor={item.type === 'income' ? item.amountMinor : -item.amountMinor}
                    currency={item.currency}
                    signed
                    tone={item.type === 'income' ? 'positive' : 'neutral'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        ))}
      </Table>

      {/* Phones: one inset group per month. */}
      <div className="flex flex-col gap-6 md:hidden">
        {[...groups.entries()].map(([month, occurrences]) => (
          <InsetSection key={month} title={formatMonth(month)}>
            {occurrences.map((item) => (
              <InsetRowStatic
                key={`${item.ruleId}-${item.date}`}
                title={item.label}
                subtitle={
                  item.dueSoon ? (
                    <StatusDot tone="warning">
                      {formatDateOnly(item.date, { style: 'short' })} ·{' '}
                      {describeDaysUntil(item.daysUntil)}
                    </StatusDot>
                  ) : (
                    `${formatDateOnly(item.date, { style: 'short' })} · ${describeDaysUntil(item.daysUntil)}`
                  )
                }
                trailing={
                  <Money
                    amountMinor={item.type === 'income' ? item.amountMinor : -item.amountMinor}
                    currency={item.currency}
                    signed
                    tone={item.type === 'income' ? 'positive' : 'neutral'}
                  />
                }
              />
            ))}
          </InsetSection>
        ))}
      </div>
    </>
  )
}
