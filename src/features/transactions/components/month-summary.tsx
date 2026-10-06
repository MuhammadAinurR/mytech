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
    <div className="px-(--gutter) pb-8">
      <dl className="grid grid-cols-3 divide-x divide-border border-y border-border">
        <Figure label="Income">
          <Money
            amountMinor={primary.incomeMinor}
            currency={primary.currency}
            tone={primary.incomeMinor === 0 ? 'muted' : 'neutral'}
          />
        </Figure>
        <Figure label="Expense">
          <Money
            amountMinor={primary.expenseMinor}
            currency={primary.currency}
            tone={primary.expenseMinor === 0 ? 'muted' : 'neutral'}
          />
        </Figure>
        <Figure label="Net">
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

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 py-4 pr-4 [&:not(:first-child)]:pl-4 sm:[&:not(:first-child)]:pl-6',
      )}
    >
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="truncate text-md font-semibold tracking-tight sm:text-xl">{children}</dd>
    </div>
  )
}
