'use client'

import { useState } from 'react'

import { formatMoney, formatMoneyCompact } from '@/lib/money'
import { formatMonth } from '@/lib/months'
import { cn } from '@/lib/utils'

import { niceCeiling, type CashFlowMonth } from '../lib/cash-flow'

/**
 * Money in and out by month, past and ahead. Two series in paired columns:
 * in on the accent, out in the context neutral. What the ledger holds is
 * solid; what recurring rules will still add is the same color in outline,
 * stacked on the current month and alone in the months ahead. A legend names
 * all three, every month has a hover/focus tooltip, and a table carries the
 * same numbers for screen readers.
 */
export function CashFlowChart({ months, currency }: { months: CashFlowMonth[]; currency: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = niceCeiling(
    Math.max(
      0,
      ...months.map((m) =>
        Math.max(m.incomeMinor + m.scheduledIncomeMinor, m.expenseMinor + m.scheduledExpenseMinor),
      ),
    ),
  )
  const ticks = max > 0 ? [max, Math.round(max / 2), 0] : [0]
  const percent = (value: number) => (max > 0 ? (value / max) * 100 : 0)
  const currentIndex = months.findIndex((m) => m.when === 'current')
  const short = (month: string) => formatMonth(month, { short: true }).split(' ')[0]
  const ahead = months.filter((m) => m.when === 'future').length
  const back = months.length - ahead

  return (
    <figure className="flex flex-col gap-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <span className="flex flex-col">
          <span className="text-sm font-medium">Money in and out</span>
          <span className="text-xs text-subtle">
            Last {back} months and next {ahead} · {currency}
          </span>
        </span>
        <span className="flex items-center gap-4 text-xs text-muted" aria-hidden>
          <Key className="bg-chart-emphasis">In</Key>
          <Key className="bg-chart-context">Out</Key>
          <Key className="border-2 border-chart-context">Scheduled</Key>
        </span>
      </figcaption>

      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
        {/* Tick labels; the invisible copy sizes the column to the widest one. */}
        <div className="relative" aria-hidden>
          <div className="invisible flex flex-col tabular text-xs">
            {ticks.map((value) => (
              <span key={value}>{formatMoneyCompact(value, currency)}</span>
            ))}
          </div>
          {ticks.map((value) => (
            <span
              key={value}
              className="absolute right-0 -translate-y-1/2 tabular text-xs whitespace-nowrap text-subtle"
              style={{ top: `${100 - percent(value)}%` }}
            >
              {formatMoneyCompact(value, currency)}
            </span>
          ))}
        </div>

        <div className="relative h-48 md:h-56">
          {/* Recessive hairline grid, the baseline one step stronger. */}
          {ticks.map((value) => (
            <span
              key={value}
              aria-hidden
              className={cn(
                'absolute inset-x-0 h-px',
                value === 0 ? 'bg-border-strong' : 'bg-border',
              )}
              style={{ top: `${100 - percent(value)}%` }}
            />
          ))}

          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
          >
            {months.map((month, index) => {
              const shown = active === month.month
              return (
                <div key={month.month} className="relative">
                  <button
                    type="button"
                    onPointerEnter={() => setActive(month.month)}
                    onPointerLeave={() =>
                      setActive((value) => (value === month.month ? null : value))
                    }
                    onFocus={() => setActive(month.month)}
                    onBlur={() => setActive((value) => (value === month.month ? null : value))}
                    aria-label={describe(month, currency)}
                    className="absolute inset-0 z-1 cursor-default rounded-xs focus-visible:outline-offset-0"
                  />
                  <div
                    aria-hidden
                    className={cn(
                      'pointer-events-none absolute inset-y-0 left-1/2 flex w-9 max-w-[80%] -translate-x-1/2 gap-0.5 transition-opacity duration-150',
                      active && !shown && 'opacity-60',
                    )}
                  >
                    <Column
                      solid={percent(month.incomeMinor)}
                      outline={percent(month.scheduledIncomeMinor)}
                      tone="emphasis"
                    />
                    <Column
                      solid={percent(month.expenseMinor)}
                      outline={percent(month.scheduledExpenseMinor)}
                      tone="context"
                    />
                  </div>
                  {shown ? (
                    <Tooltip
                      month={month}
                      currency={currency}
                      align={index < 2 ? 'start' : index > months.length - 3 ? 'end' : 'center'}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <span aria-hidden />
        <div
          className="grid pt-2 text-xs"
          style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
          aria-hidden
        >
          {months.map((month, index) => (
            <span
              key={month.month}
              className={cn(
                'text-center',
                month.when === 'current' ? 'font-medium text-fg' : 'text-subtle',
                // On a phone every other month is labeled, always including this one.
                (index - currentIndex) % 2 !== 0 && 'max-sm:invisible',
              )}
            >
              {short(month.month)}
            </span>
          ))}
        </div>
      </div>

      {/* Same numbers without the chart, for screen readers. The wrapper clips
          it: a table ignores sr-only's 1px width and would widen the page. */}
      <div className="sr-only">
        <table>
          <caption>Money in and out by month in {currency}</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">In</th>
              <th scope="col">Out</th>
              <th scope="col">Scheduled in</th>
              <th scope="col">Scheduled out</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.month}>
                <th scope="row">{formatMonth(month.month)}</th>
                <td>{formatMoney(month.incomeMinor, currency)}</td>
                <td>{formatMoney(month.expenseMinor, currency)}</td>
                <td>{formatMoney(month.scheduledIncomeMinor, currency)}</td>
                <td>{formatMoney(month.scheduledExpenseMinor, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

/** A legend entry whose key is a tiny column, shaped like the marks it names. */
function Key({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-3 w-2.5 rounded-t-xs', className)} />
      {children}
    </span>
  )
}

/**
 * One series in one month: the ledger amount from the baseline, and what is
 * still scheduled on top of it, a 2px gap between. Only the top end is rounded.
 */
function Column({
  solid,
  outline,
  tone,
}: {
  solid: number
  outline: number
  tone: 'emphasis' | 'context'
}) {
  return (
    <div className="relative h-full flex-1">
      {solid > 0 ? (
        <span
          className={cn(
            'absolute inset-x-0 bottom-0',
            tone === 'emphasis' ? 'bg-chart-emphasis' : 'bg-chart-context',
            outline > 0 ? '' : 'rounded-t-xs',
          )}
          // A hairline at least, so a small amount never disappears.
          style={{ height: `max(${solid}%, 1px)` }}
        />
      ) : null}
      {outline > 0 ? (
        <span
          className={cn(
            'absolute inset-x-0 rounded-t-xs border-2',
            tone === 'emphasis' ? 'border-chart-emphasis' : 'border-chart-context',
          )}
          style={{
            bottom: solid > 0 ? `calc(max(${solid}%, 1px) + 2px)` : 0,
            // The gap comes out of the outline, so the stack still ends at its
            // total; and it stays tall enough to read as an outline, not a sliver.
            height: solid > 0 ? `max(calc(${outline}% - 2px), 6px)` : `max(${outline}%, 6px)`,
          }}
        />
      ) : null}
    </div>
  )
}

/** What a month's column announces: "October 2026: in $1.00, out $2.00; still due …". */
function describe(month: CashFlowMonth, currency: string): string {
  const pair = (income: number, expense: number) =>
    `in ${formatMoney(income, currency)}, out ${formatMoney(expense, currency)}`
  const parts: string[] = []
  if (month.when !== 'future') parts.push(pair(month.incomeMinor, month.expenseMinor))
  if (month.when !== 'past') {
    const prefix = month.when === 'current' ? 'still due' : 'scheduled'
    parts.push(`${prefix} ${pair(month.scheduledIncomeMinor, month.scheduledExpenseMinor)}`)
  }
  return `${formatMonth(month.month)}: ${parts.join('; ')}`
}

function Tooltip({
  month,
  currency,
  align,
}: {
  month: CashFlowMonth
  currency: string
  /** Edge columns anchor to their own edge so the tooltip never leaves the chart. */
  align: 'start' | 'center' | 'end'
}) {
  const money = (value: number) => formatMoney(value, currency).replace(/^-/, '−')
  const signed = (value: number) =>
    formatMoney(value, currency, { signDisplay: 'exceptZero' }).replace(/^-/, '−')
  const scheduledNet = month.scheduledIncomeMinor - month.scheduledExpenseMinor
  const net = month.incomeMinor - month.expenseMinor
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-full z-10 mb-2 w-52 rounded-sm bg-surface-raised p-2.5 text-xs shadow-popover',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
      )}
    >
      <p className="text-subtle">
        {formatMonth(month.month)}
        {month.when === 'future' ? ' · scheduled' : ''}
      </p>
      <p className="mt-1 tabular text-sm font-semibold">
        {signed(month.when === 'future' ? scheduledNet : net)}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-0.5 text-muted">
        {month.when !== 'future' ? (
          <>
            <Row tone="emphasis" label="In" value={money(month.incomeMinor)} />
            <Row tone="context" label="Out" value={money(month.expenseMinor)} />
          </>
        ) : null}
        {month.when === 'future' ? (
          <>
            <Row tone="emphasis" label="In" value={money(month.scheduledIncomeMinor)} />
            <Row tone="context" label="Out" value={money(month.scheduledExpenseMinor)} />
          </>
        ) : null}
        {/* This month lists what is still due only when something is. */}
        {month.when === 'current' && month.scheduledIncomeMinor > 0 ? (
          <Row tone="emphasis" label="Still due in" value={money(month.scheduledIncomeMinor)} />
        ) : null}
        {month.when === 'current' && month.scheduledExpenseMinor > 0 ? (
          <Row tone="context" label="Still due out" value={money(month.scheduledExpenseMinor)} />
        ) : null}
      </dl>
    </div>
  )
}

function Row({
  tone,
  label,
  value,
}: {
  tone: 'emphasis' | 'context'
  label: string
  value: string
}) {
  // A short stroke of the series color keys the row, never a filled box.
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'h-0.5 w-2.5 rounded-full',
          tone === 'emphasis' ? 'bg-chart-emphasis' : 'bg-chart-context',
        )}
      />
      <dt>{label}</dt>
      <dd className="text-right tabular">{value}</dd>
    </>
  )
}
