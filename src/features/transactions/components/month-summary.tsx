import { Money } from '@/components/money'
import { cn } from '@/lib/utils'
import type { CurrencySummary } from '@/server/queries/transactions'

/**
 * Income, expense, and net for the month. The primary currency gets large
 * figures; any other currencies used that month are listed beneath.
 */
export function MonthSummary({
  summary,
  primaryCurrency,
}: {
  summary: CurrencySummary[]
  primaryCurrency: string
}) {
  const primary = summary.find((row) => row.currency === primaryCurrency) ?? {
    currency: primaryCurrency,
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
    count: 0,
  }
  const others = summary.filter((row) => row.currency !== primary.currency)

  return (
    <div className="px-(--gutter) pb-8 max-md:px-4 max-md:pb-6">
      {/* Desktop: three hairline-ruled figures. Mobile: a card with the net on
          top across its width and income and expense side by side below, so
          long amounts (IDR) never truncate. */}
      <dl className="grid grid-cols-3 divide-x divide-border border-y border-border max-md:grid-cols-2 max-md:gap-x-4 max-md:divide-x-0 max-md:rounded-lg max-md:border-y-0 max-md:bg-surface max-md:px-4">
        <Figure label="Income" className="max-md:order-2">
          <Money
            amountMinor={primary.incomeMinor}
            currency={primary.currency}
            tone={primary.incomeMinor === 0 ? 'muted' : 'neutral'}
          />
        </Figure>
        <Figure label="Expense" className="max-md:order-3">
          <Money
            amountMinor={primary.expenseMinor}
            currency={primary.currency}
            tone={primary.expenseMinor === 0 ? 'muted' : 'neutral'}
          />
        </Figure>
        <Figure
          label="Net"
          className="max-md:order-1 max-md:col-span-2 max-md:border-b max-md:border-border"
          large
        >
          <Money
            amountMinor={primary.netMinor}
            currency={primary.currency}
            signed
            tone={primary.netMinor > 0 ? 'positive' : primary.netMinor === 0 ? 'muted' : 'neutral'}
          />
        </Figure>
      </dl>
      {others.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
          {others.map((row) => (
            <li key={row.currency} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium text-fg">{row.currency}</span>
              <Sep />
              <span>
                <Money amountMinor={row.incomeMinor} currency={row.currency} className="text-fg" />{' '}
                in
              </span>
              <Sep />
              <span>
                <Money amountMinor={row.expenseMinor} currency={row.currency} className="text-fg" />{' '}
                out
              </span>
              <Sep />
              <span>
                <Money
                  amountMinor={row.netMinor}
                  currency={row.currency}
                  signed
                  className="text-fg"
                />{' '}
                net
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Sep() {
  return (
    <span aria-hidden className="text-subtle">
      ·
    </span>
  )
}

function Figure({
  label,
  children,
  className,
  large = false,
}: {
  label: string
  children: React.ReactNode
  className?: string
  /** The headline figure on mobile (the net). */
  large?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 py-4 pr-4 [&:not(:first-child)]:pl-4 sm:[&:not(:first-child)]:pl-6',
        'max-md:py-3.5 max-md:pr-0 max-md:[&:not(:first-child)]:pl-0',
        className,
      )}
    >
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={cn(
          'truncate text-md font-semibold tracking-tight sm:text-xl',
          large && 'max-md:text-xl',
        )}
      >
        {children}
      </dd>
    </div>
  )
}
