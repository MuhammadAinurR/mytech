'use client'

import { useState } from 'react'

import { formatMoney, formatMoneyCompact } from '@/lib/money'
import { formatMonth } from '@/lib/months'
import { cn } from '@/lib/utils'
import type { MonthPoint } from '@/server/queries/transactions'

/**
 * Net by month as columns. Emphasis form: the current month in the accent,
 * earlier months in the context neutral. One series, so no legend; the
 * current month is labeled directly, every column has a hover/focus tooltip,
 * and a table carries the same numbers for screen readers.
 */
export function NetChart({ points, currency }: { points: MonthPoint[]; currency: string }) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, ...points.map((p) => Math.max(p.netMinor, 0)))
  const min = Math.min(0, ...points.map((p) => p.netMinor))
  const range = max - min
  const zero = (max / range) * 100 // % from the top where the baseline sits
  const ticks = [max, max / 2, 0].filter((value, index, all) => all.indexOf(value) === index)
  const current = points.at(-1)?.month
  const short = (month: string) => formatMonth(month, { short: true }).split(' ')[0]

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium">Net by month</span>
        <span className="text-xs text-subtle">
          Last {points.length} months · {currency}
        </span>
      </figcaption>

      {/* Headroom above the plot keeps the direct label clear of the caption. */}
      <div className="relative h-48 pt-6">
        <div className="relative h-full">
          {/* Recessive hairline grid with clean tick labels. */}
          {ticks.map((value) => (
            <div
              key={value}
              aria-hidden
              className="absolute inset-x-0 flex items-center gap-2"
              style={{ top: `${((max - value) / range) * 100}%` }}
            >
              <span className="w-10 shrink-0 -translate-y-1/2 text-right tabular text-xs text-subtle">
                {formatMoneyCompact(Math.round(value), currency)}
              </span>
              <span
                className={cn(
                  'h-px flex-1 -translate-y-1/2',
                  value === 0 ? 'bg-border-strong' : 'bg-border',
                )}
              />
            </div>
          ))}

          <div
            className="absolute inset-y-0 right-0 left-12 grid"
            style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
          >
            {points.map((point, index) => {
              const height = (Math.abs(point.netMinor) / range) * 100
              const positive = point.netMinor >= 0
              const emphasis = point.month === current
              const shown = active === point.month
              return (
                <div key={point.month} className="relative">
                  <button
                    type="button"
                    onPointerEnter={() => setActive(point.month)}
                    onPointerLeave={() =>
                      setActive((value) => (value === point.month ? null : value))
                    }
                    onFocus={() => setActive(point.month)}
                    onBlur={() => setActive((value) => (value === point.month ? null : value))}
                    aria-label={`${formatMonth(point.month)}: net ${formatMoney(point.netMinor, currency)}, income ${formatMoney(point.incomeMinor, currency)}, expense ${formatMoney(point.expenseMinor, currency)}`}
                    className="absolute inset-0 cursor-default rounded-xs focus-visible:outline-offset-0"
                  />
                  <div
                    className={cn(
                      'pointer-events-none absolute left-1/2 w-6 max-w-[60%] -translate-x-1/2 transition-opacity duration-150',
                      emphasis ? 'bg-chart-emphasis' : 'bg-chart-context',
                      positive ? 'rounded-t-xs' : 'rounded-b-xs',
                      active && !shown && 'opacity-60',
                    )}
                    style={
                      positive
                        ? {
                            bottom: `${100 - zero}%`,
                            height: `${Math.max(height, point.netMinor === 0 ? 0 : 1)}%`,
                          }
                        : { top: `${zero}%`, height: `${height}%` }
                    }
                  />
                  {emphasis && !shown ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-1/2 -translate-x-1/2 tabular text-xs font-medium whitespace-nowrap"
                      style={
                        positive
                          ? { bottom: `calc(${100 - zero + height}% + 4px)` }
                          : { top: `calc(${zero + height}% + 4px)` }
                      }
                    >
                      {formatMoneyCompact(point.netMinor, currency)}
                    </span>
                  ) : null}
                  {shown ? (
                    <Tooltip
                      point={point}
                      currency={currency}
                      align={index < 2 ? 'start' : index > points.length - 3 ? 'end' : 'center'}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className="grid pl-12 text-xs"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {points.map((point) => (
          <span
            key={point.month}
            className={cn(
              'text-center',
              point.month === current ? 'font-medium text-fg' : 'text-subtle',
            )}
          >
            {short(point.month)}
          </span>
        ))}
      </div>

      {/* Same numbers without the chart, for screen readers. */}
      <table className="sr-only">
        <caption>Net by month in {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Expense</th>
            <th scope="col">Net</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonth(point.month)}</th>
              <td>{formatMoney(point.incomeMinor, currency)}</td>
              <td>{formatMoney(point.expenseMinor, currency)}</td>
              <td>{formatMoney(point.netMinor, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

function Tooltip({
  point,
  currency,
  align,
}: {
  point: MonthPoint
  currency: string
  /** Edge columns anchor to their own edge so the tooltip never leaves the chart. */
  align: 'start' | 'center' | 'end'
}) {
  const money = (value: number) => formatMoney(value, currency).replace(/^-/, '−')
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-full z-10 mb-2 w-44 rounded-sm bg-surface-raised p-2.5 text-xs shadow-popover',
        align === 'start' && 'left-0',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'end' && 'right-0',
      )}
    >
      <p className="text-subtle">{formatMonth(point.month)}</p>
      <p className="mt-1 tabular text-sm font-semibold">{money(point.netMinor)}</p>
      <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-muted">
        <dt>Income</dt>
        <dd className="text-right tabular">{money(point.incomeMinor)}</dd>
        <dt>Expense</dt>
        <dd className="text-right tabular">{money(point.expenseMinor)}</dd>
      </dl>
    </div>
  )
}
