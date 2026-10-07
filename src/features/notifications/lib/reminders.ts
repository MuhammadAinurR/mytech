import { addDays, diffInDays, formatDateOnly } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

/** Reminders go out from this local hour on (the worker runs every 15 minutes). */
export const REMINDER_HOUR = 9

export type ReminderKind = 'upcoming' | 'due' | 'overdue'

/** Days from today until the due date for each reminder. */
export const REMINDER_DAYS_BEFORE_DUE: Record<ReminderKind, number> = {
  upcoming: 3,
  due: 0,
  overdue: -1,
}

/** Which reminder an unpaid invoice is owed today, if any. */
export function reminderKind(today: string, dueDate: string): ReminderKind | null {
  const days = diffInDays(today, dueDate)
  for (const [kind, offset] of Object.entries(REMINDER_DAYS_BEFORE_DUE)) {
    if (days === offset) return kind as ReminderKind
  }
  return null
}

/** The hour (0–23) it is now in a timezone. */
export function localHour(now: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(now)
    .find((part) => part.type === 'hour')?.value
  return Number(hour ?? 0)
}

/**
 * Due dates worth looking at, across every timezone (UTC−12 to UTC+14): a
 * small superset of each user's window, narrowed per user afterwards.
 */
export function candidateDueDates(utcToday: string): { from: string; to: string } {
  return { from: addDays(utcToday, -2), to: addDays(utcToday, 4) }
}

export type ReminderInvoice = {
  id: string
  numberLabel: string
  clientName: string
  totalMinor: number
  currency: string
  dueDate: string
}

export type PushMessage = { title: string; body: string; url: string; tag: string }

const WHEN: Record<ReminderKind, { one: string; many: string }> = {
  upcoming: { one: 'is due in 3 days', many: 'are due in 3 days' },
  due: { one: 'is due today', many: 'are due today' },
  overdue: { one: 'is overdue', many: 'are overdue' },
}

/** One notification per kind: a single invoice by name, several as a summary. */
export function reminderMessage(kind: ReminderKind, invoices: ReminderInvoice[]): PushMessage {
  const [first] = invoices
  if (!first) throw new Error('reminderMessage needs at least one invoice')

  if (invoices.length === 1) {
    const amount = formatMoney(first.totalMinor, first.currency)
    const detail =
      kind === 'upcoming'
        ? ` · due ${formatDateOnly(first.dueDate, { style: 'short' })}`
        : kind === 'overdue'
          ? ' · was due yesterday'
          : ''
    return {
      title: `${first.numberLabel} ${WHEN[kind].one}`,
      body: `${first.clientName} · ${amount}${detail}`,
      url: `/invoices/${first.id}`,
      tag: `invoice-${first.id}-${kind}`,
    }
  }

  const names = [...new Set(invoices.map((invoice) => invoice.clientName))]
  const shown = names.slice(0, 2).join(', ')
  const rest = names.length - 2
  return {
    title: `${invoices.length} invoices ${WHEN[kind].many}`,
    body: rest > 0 ? `${shown}, and ${rest} more` : shown,
    url: '/invoices?status=sent',
    tag: `invoices-${kind}-${first.dueDate}`,
  }
}
