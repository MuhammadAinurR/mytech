import { Bell } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'

import { Money } from '@/components/money'
import { scheduledTotals, type ScheduledEntry } from '@/features/recurring/lib/forecast'
import { addDays, describeDaysUntil, diffInDays, formatDateOnly, type DateOnly } from '@/lib/dates'
import type { OpenReminder } from '@/server/queries/recurring'

import { DismissReminder } from './dismiss-reminder'
import { QuietEmpty } from './section'

const SOON_DAYS = 30
const SOON_ROWS = 6
const YEARLY_ROWS = 5

const rowClasses =
  'flex items-center gap-3 border-b border-border py-2 text-sm last:border-b-0 max-md:min-h-13 max-md:py-2.5 max-md:text-md'

/**
 * What recurring rules will cost (or bring in) from today: the total to pay
 * over the next 30 days and 12 months, open reminders, each payment in the
 * next 30 days, and yearly renewals further out, which are the easy ones to
 * forget. `scheduled` covers the next 12 months.
 */
export function ComingUp({
  today,
  currency,
  reminders,
  scheduled,
}: {
  today: DateOnly
  /** The user's own currency, listed first. */
  currency: string
  reminders: OpenReminder[]
  scheduled: ScheduledEntry[]
}) {
  const soonUntil = addDays(today, SOON_DAYS)
  const reminded = new Set(reminders.map((r) => `${r.ruleId}:${r.occurrenceDate}`))
  const soon = scheduled
    .filter((entry) => entry.date <= soonUntil && !reminded.has(`${entry.ruleId}:${entry.date}`))
    .slice(0, Math.max(0, SOON_ROWS - reminders.length))
  const yearly = scheduled
    .filter((entry) => entry.frequency === 'yearly' && entry.date > soonUntil)
    .slice(0, YEARLY_ROWS)

  const nextMonth = new Map(
    scheduledTotals(scheduled.filter((entry) => entry.date <= soonUntil)).map((t) => [
      t.currency,
      t.expenseMinor,
    ]),
  )
  const toPay = scheduledTotals(scheduled)
    .filter((total) => total.expenseMinor > 0)
    .sort((a, b) =>
      a.currency === currency ? -1 : b.currency === currency ? 1 : a.currency < b.currency ? -1 : 1,
    )

  if (reminders.length === 0 && soon.length === 0 && yearly.length === 0 && toPay.length === 0) {
    return (
      <QuietEmpty>
        Nothing scheduled.{' '}
        <Link
          href="/transactions/recurring?new=1"
          className="font-medium text-accent hover:underline"
        >
          Add a recurring rule
        </Link>{' '}
        for servers and domains to see what’s coming.
      </QuietEmpty>
    )
  }

  return (
    <>
      {toPay.length > 0 ? (
        // One row per currency, so a currency's two figures always sit together.
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 max-md:border-b max-md:border-border max-md:py-3.5">
          {toPay.map((total) => (
            <Fragment key={total.currency}>
              <div>
                <dt className="text-xs text-muted">To pay in 30 days · {total.currency}</dt>
                <dd className="text-md font-semibold">
                  <Money
                    amountMinor={nextMonth.get(total.currency) ?? 0}
                    currency={total.currency}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">To pay in 12 months · {total.currency}</dt>
                <dd className="text-md font-semibold">
                  <Money amountMinor={total.expenseMinor} currency={total.currency} />
                </dd>
              </div>
            </Fragment>
          ))}
        </dl>
      ) : null}

      {reminders.length > 0 || soon.length > 0 ? (
        <ul className="flex flex-col">
          {reminders.map((reminder) => (
            <li key={reminder.id} className={rowClasses}>
              <Bell aria-hidden className="size-4 text-warning" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{reminder.label}</p>
                <p className="text-xs text-muted">
                  {formatDateOnly(reminder.occurrenceDate, { style: 'short' })} ·{' '}
                  {describeDaysUntil(diffInDays(today, reminder.occurrenceDate))}
                </p>
              </div>
              <Amount entry={reminder} />
              <DismissReminder id={reminder.id} label={reminder.label} />
            </li>
          ))}
          {soon.map((entry) => (
            <li key={`${entry.ruleId}-${entry.date}`} className={rowClasses}>
              <span aria-hidden className="size-4" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{entry.label}</p>
                <p className="text-xs text-muted">
                  {formatDateOnly(entry.date, { style: 'short' })} ·{' '}
                  {describeDaysUntil(diffInDays(today, entry.date))}
                </p>
              </div>
              <Amount entry={entry} muted />
              <span aria-hidden className="size-7" />
            </li>
          ))}
        </ul>
      ) : (
        <QuietEmpty>Nothing due in the next {SOON_DAYS} days.</QuietEmpty>
      )}

      {yearly.length > 0 ? (
        <>
          <h3 className="pt-3 text-xs text-muted max-md:border-t max-md:border-border">
            Yearly renewals
          </h3>
          <ul className="flex flex-col">
            {yearly.map((entry) => (
              <li key={`${entry.ruleId}-${entry.date}`} className={rowClasses}>
                <span className="w-24 shrink-0 tabular text-muted max-md:w-28">
                  {formatDateOnly(entry.date, { style: 'medium' })}
                </span>
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                <Amount entry={entry} muted />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  )
}

function Amount({
  entry,
  muted = false,
}: {
  entry: { type: 'income' | 'expense'; amountMinor: number; currency: string }
  /** Not yet due: expenses recede until their reminder comes up. */
  muted?: boolean
}) {
  return (
    <Money
      amountMinor={entry.type === 'income' ? entry.amountMinor : -entry.amountMinor}
      currency={entry.currency}
      signed
      tone={entry.type === 'income' ? 'positive' : muted ? 'muted' : 'neutral'}
      className="text-sm max-md:text-md"
    />
  )
}
