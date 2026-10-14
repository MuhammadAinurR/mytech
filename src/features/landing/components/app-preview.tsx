import { NAV_ITEMS } from '@/components/app-shell/nav'
import { cn } from '@/lib/utils'

/**
 * A miniature of the dashboard, drawn with the real tokens so it follows the
 * theme. Decorative: the copy around it says the same things.
 */
export function AppPreview() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border border-border bg-surface text-left"
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-background px-4 py-2.5">
        <span className="size-2 rounded-full bg-fill-strong" />
        <span className="size-2 rounded-full bg-fill-strong" />
        <span className="size-2 rounded-full bg-fill-strong" />
      </div>
      <div className="grid sm:grid-cols-[10.5rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-0.5 border-r border-border bg-background p-3 sm:flex">
          {NAV_ITEMS.map((item, index) => (
            <span
              key={item.href}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm [&_svg]:size-4',
                index === 0 ? 'bg-fill font-medium text-fg' : 'text-muted',
              )}
            >
              <item.icon aria-hidden />
              {item.label}
            </span>
          ))}
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-muted">Net in October 2026</p>
          <p className="mt-1 tabular text-xl font-semibold tracking-[-0.02em] text-success">
            +$5,020.01
          </p>
          <div className="mt-6 flex h-20 items-end gap-2 sm:h-24">
            {[46, 72, 58, 66, 61, 84].map((height, index, bars) => (
              <span key={index} className="flex flex-1 items-end justify-center">
                <span
                  style={{ height: `${height}%` }}
                  className={cn(
                    'block h-full w-3/5 rounded-t-xs',
                    index === bars.length - 1 ? 'bg-accent' : 'bg-fill-strong',
                  )}
                />
              </span>
            ))}
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-xs text-subtle">
            <span>May</span>
            <span>Oct</span>
          </div>
          <p className="mt-6 text-xs text-muted">Unpaid invoices</p>
          <div className="mt-1">
            <PreviewInvoice
              client="Juniper Bank"
              number="SE-0043"
              status="Overdue"
              dot="bg-danger"
              amount="$1,800.00"
            />
            <PreviewInvoice
              client="Atlas Freight"
              number="SE-0044"
              status="Sent"
              dot="bg-accent"
              amount="$1,000.00"
              last
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewInvoice({
  client,
  number,
  status,
  dot,
  amount,
  last = false,
}: {
  client: string
  number: string
  status: string
  dot: string
  amount: string
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-b border-border py-2.5',
        last && 'border-b-0',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{client}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <span className="font-mono">{number}</span>
          <span className={cn('size-1.5 rounded-full', dot)} />
          {status}
        </p>
      </div>
      <p className="tabular text-sm">{amount}</p>
    </div>
  )
}
