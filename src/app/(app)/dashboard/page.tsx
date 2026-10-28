import type { Metadata } from 'next'
import Link from 'next/link'

import { CachedView } from '@/components/app-shell/cached-view'
import { Money } from '@/components/money'
import { PageSkeleton } from '@/components/page-skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import { CashFlowChart } from '@/features/dashboard/components/cash-flow-chart'
import { ComingUp } from '@/features/dashboard/components/coming-up'
import { QuickAdd } from '@/features/dashboard/components/quick-add'
import { DashboardSection, QuietEmpty } from '@/features/dashboard/components/section'
import { cashFlow } from '@/features/dashboard/lib/cash-flow'
import { InvoiceStatusDot } from '@/features/invoices/components/invoice-status'
import { formatDateRange } from '@/features/projects/lib/board'
import { scheduledByMonth } from '@/features/recurring/lib/forecast'
import { addDays, diffInDays, formatDateOnly, todayInTimeZone } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { formatMonth, shiftMonth } from '@/lib/months'
import { cn } from '@/lib/utils'
import { requireUser } from '@/server/auth/session'
import { getReceivables, listDueInvoices } from '@/server/queries/invoices'
import { listOngoingInRange } from '@/server/queries/projects'
import { listOpenReminders, listScheduled } from '@/server/queries/recurring'
import {
  getMonthlySeries,
  getMonthlySummary,
  listTransactions,
} from '@/server/queries/transactions'
import type { CurrentUser } from '@/server/queries/users'

export const metadata: Metadata = { title: 'Dashboard' }

/** Months of history in the chart, this one included, and months ahead of it. */
const CHART_BACK = 6
const CHART_AHEAD = 6
/** "Next 12 months" in Coming up, and the forecast's reach. */
const FORECAST_DAYS = 364

export default async function DashboardPage() {
  const user = await requireUser()
  return (
    <CachedView cacheKey="/dashboard" content={renderDashboard(user)} fallback={<PageSkeleton />} />
  )
}

async function renderDashboard(user: CurrentUser) {
  const today = todayInTimeZone(user.timezone)
  const month = today.slice(0, 7)
  const currency = user.defaultCurrency
  const back = Array.from({ length: CHART_BACK }, (_, i) => shiftMonth(month, i - CHART_BACK + 1))
  // This month too: it has history and what is still to come.
  const ahead = Array.from({ length: CHART_AHEAD + 1 }, (_, i) => shiftMonth(month, i))

  const [summary, series, recent, reminders, scheduled, receivables, dueInvoices, projects] =
    await Promise.all([
      getMonthlySummary(user.id, month),
      getMonthlySeries(user.id, currency, back),
      listTransactions(user.id, { pageSize: 5 }),
      listOpenReminders(user.id, today),
      listScheduled(user.id, today, addDays(today, FORECAST_DAYS)),
      getReceivables(user.id, today),
      listDueInvoices(user.id, 5),
      listOngoingInRange(user.id, today, today),
    ])

  const primary = summary.find((row) => row.currency === currency)
  const net = primary?.netMinor ?? 0
  const others = summary.filter((row) => row.currency !== currency)
  const flow = cashFlow(series, scheduledByMonth(scheduled, currency, ahead), month)
  const stillDue = flow.find((row) => row.when === 'current')?.scheduledExpenseMinor ?? 0
  const year = today.slice(0, 4)
  const signed = (amount: number, cur: string) =>
    formatMoney(amount, cur, { signDisplay: 'exceptZero' }).replace(/^-/, '−')

  return (
    <div
      data-grouped
      className="relative px-(--gutter) pt-8 pb-16 max-md:px-4 max-md:pt-(--title-top) max-md:pb-8"
    >
      {/* The one ambient light field, behind the hero card (mobile only). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] ambient-field md:hidden"
      />
      <header className="relative flex flex-col gap-1">
        <h1 className="text-lg font-semibold max-md:text-xl max-md:tracking-[-0.02em]">
          Dashboard
        </h1>
        <p className="text-sm text-muted">{formatDateOnly(today, { style: 'long' })}</p>
      </header>

      <div className="relative mt-8 grid gap-x-12 gap-y-10 max-md:mt-6 max-md:flex max-md:flex-col max-md:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
        <div className="flex min-w-0 flex-col gap-10 max-md:contents">
          <section
            aria-labelledby="this-month"
            className="flex flex-col gap-6 max-md:order-1 max-md:gap-4"
          >
            {/* On mobile the hero figure sits on glass over the ambient field. */}
            <div className="flex flex-col gap-2 max-md:glass max-md:relative max-md:rounded-2xl max-md:p-5 max-md:glass-hero">
              <h2 id="this-month" className="text-sm text-muted">
                Net in {formatMonth(month)}
              </h2>
              {/* The one hero figure: proportional numerals at display size. */}
              <p
                className={cn(
                  'text-2xl font-semibold',
                  net > 0 && 'text-success',
                  net === 0 && 'text-muted',
                )}
              >
                {signed(net, currency)}
              </p>
              <p className="text-sm text-muted">
                <Money
                  amountMinor={primary?.incomeMinor ?? 0}
                  currency={currency}
                  className="text-fg"
                />{' '}
                in
                <span className="px-2 text-subtle" aria-hidden>
                  ·
                </span>
                <Money
                  amountMinor={primary?.expenseMinor ?? 0}
                  currency={currency}
                  className="text-fg"
                />{' '}
                out
                {stillDue > 0 ? (
                  <>
                    <span className="px-2 text-subtle" aria-hidden>
                      ·
                    </span>
                    <Money amountMinor={stillDue} currency={currency} className="text-fg" /> still
                    due
                  </>
                ) : null}
                {others.map((row) => (
                  <span key={row.currency}>
                    <span className="px-2 text-subtle" aria-hidden>
                      ·
                    </span>
                    {row.currency} {signed(row.netMinor, row.currency)}
                  </span>
                ))}
              </p>
            </div>
            <QuickAdd />
            <div className="max-md:rounded-lg max-md:bg-surface max-md:p-4">
              <CashFlowChart months={flow} currency={currency} />
            </div>
          </section>

          <DashboardSection
            title="Recent transactions"
            href="/transactions"
            className="max-md:order-4"
          >
            {recent.items.length === 0 ? (
              <QuietEmpty>
                No transactions yet.{' '}
                <Link
                  href="/transactions?new=1"
                  className="font-medium text-accent hover:underline"
                >
                  Add one
                </Link>
                .
              </QuietEmpty>
            ) : (
              <ul className="flex flex-col">
                {recent.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 border-b border-border py-2.5 text-sm last:border-b-0 max-md:min-h-13 max-md:text-md"
                  >
                    <span className="w-14 shrink-0 tabular text-muted">
                      {formatDateOnly(item.occurredOn, {
                        style: item.occurredOn.startsWith(year) ? 'short' : 'medium',
                      })}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {item.category}
                      {item.invoiceNumber ? (
                        <span className="ml-2 font-mono text-xs text-muted">
                          {item.invoiceNumber}
                        </span>
                      ) : null}
                    </span>
                    <Money
                      amountMinor={item.type === 'income' ? item.amountMinor : -item.amountMinor}
                      currency={item.currency}
                      signed
                      tone={item.type === 'income' ? 'positive' : 'neutral'}
                    />
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </div>

        <div className="flex min-w-0 flex-col gap-10 max-md:contents">
          <DashboardSection
            className="max-md:order-2"
            first
            title="Coming up"
            href="/transactions/renewals"
            linkLabel="Renewals"
          >
            <ComingUp
              today={today}
              currency={currency}
              reminders={reminders}
              scheduled={scheduled}
            />
          </DashboardSection>

          <DashboardSection
            title="Unpaid invoices"
            href="/invoices?status=sent"
            className="max-md:order-3"
          >
            {receivables.length > 0 ? (
              <dl className="flex flex-wrap gap-x-8 gap-y-2 max-md:border-b max-md:border-border max-md:py-3.5">
                {receivables.map((row) => (
                  <div key={row.currency}>
                    <dt className="text-xs text-muted">Outstanding · {row.currency}</dt>
                    <dd className="text-md font-semibold">
                      <Money amountMinor={row.outstandingMinor} currency={row.currency} />
                      {row.overdueCount > 0 ? (
                        <span className="ml-2 text-xs font-normal text-danger">
                          {row.overdueCount} overdue
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {dueInvoices.length === 0 ? (
              <QuietEmpty>No unpaid invoices.</QuietEmpty>
            ) : (
              <ul className="flex flex-col">
                {dueInvoices.map((invoice) => (
                  <li key={invoice.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="flex items-center gap-3 py-2 text-sm hover:bg-fill/60 max-md:min-h-13 max-md:py-2.5 max-md:text-md max-md:hover:bg-transparent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{invoice.clientName}</p>
                        <p className="flex items-center gap-2 text-xs text-muted">
                          <span className="font-mono">{invoice.numberLabel}</span>
                          <InvoiceStatusDot
                            status={invoice.status}
                            dueDate={invoice.dueDate}
                            today={today}
                          />
                        </p>
                      </div>
                      <Money amountMinor={invoice.totalMinor} currency={invoice.currency} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <DashboardSection
            title="Ongoing projects"
            href="/projects/calendar"
            linkLabel="Calendar"
            className="max-md:order-5"
          >
            {projects.length === 0 ? (
              <QuietEmpty>No projects in progress today.</QuietEmpty>
            ) : (
              <ul className="flex flex-col">
                {projects.map((project) => {
                  const left = diffInDays(today, project.endDate!)
                  return (
                    <li
                      key={project.id}
                      className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-b-0 max-md:min-h-13 max-md:py-2.5 max-md:text-md"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{project.name}</p>
                        <p className="tabular text-xs text-muted">
                          {formatDateRange(project.startDate!, project.endDate!, year)}
                        </p>
                      </div>
                      {left <= 3 ? (
                        <StatusDot tone="warning" className="text-xs">
                          {left === 0
                            ? 'Ends today'
                            : `${left} ${left === 1 ? 'day' : 'days'} left`}
                        </StatusDot>
                      ) : (
                        <span className="text-xs text-muted">{left} days left</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </DashboardSection>
        </div>
      </div>
    </div>
  )
}
