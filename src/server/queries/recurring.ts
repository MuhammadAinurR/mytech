import 'server-only'

import { and, asc, desc, eq, gte, isNull } from 'drizzle-orm'

import {
  nextOccurrence,
  occurrencesBetween,
  type RecurrenceSpec,
} from '@/features/recurring/lib/recurrence'
import { type RecurringRuleInput } from '@/features/recurring/schema'
import { type TransactionType } from '@/features/transactions/schema'
import { addDays, diffInDays, type DateOnly } from '@/lib/dates'

import { db } from '../db'
import { recurringRules, reminders } from '../db/schema'

/** Data access for recurring rules and reminders, always scoped by owner. */

const ruleColumns = {
  id: recurringRules.id,
  label: recurringRules.label,
  type: recurringRules.type,
  amountMinor: recurringRules.amountMinor,
  currency: recurringRules.currency,
  category: recurringRules.category,
  note: recurringRules.note,
  frequency: recurringRules.frequency,
  dayOfMonth: recurringRules.dayOfMonth,
  monthOfYear: recurringRules.monthOfYear,
  startsOn: recurringRules.startsOn,
  endsOn: recurringRules.endsOn,
  isActive: recurringRules.isActive,
  reminderDaysBefore: recurringRules.reminderDaysBefore,
}

export type RecurringRule = {
  id: string
  label: string
  type: TransactionType
  amountMinor: number
  currency: string
  category: string
  note: string | null
  frequency: RecurrenceSpec['frequency']
  dayOfMonth: number
  monthOfYear: number | null
  startsOn: string
  endsOn: string | null
  isActive: boolean
  reminderDaysBefore: number | null
}

export type RuleWithNext = RecurringRule & { nextOn: DateOnly | null }

function specOf(rule: RecurringRule): RecurrenceSpec {
  return {
    frequency: rule.frequency,
    dayOfMonth: rule.dayOfMonth,
    monthOfYear: rule.monthOfYear,
    startsOn: rule.startsOn,
    endsOn: rule.endsOn,
  }
}

/** All of a user's rules with their next occurrence, active first, soonest first. */
export async function listRules(userId: string, today: DateOnly): Promise<RuleWithNext[]> {
  const rows = await db
    .select(ruleColumns)
    .from(recurringRules)
    .where(eq(recurringRules.userId, userId))
    .orderBy(desc(recurringRules.isActive), asc(recurringRules.label))
  return rows
    .map((rule) => ({
      ...rule,
      nextOn: rule.isActive ? nextOccurrence(specOf(rule), today) : null,
    }))
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return (a.nextOn ?? '9999') < (b.nextOn ?? '9999') ? -1 : 1
    })
}

export async function getRule(userId: string, id: string): Promise<RecurringRule | null> {
  const [row] = await db
    .select(ruleColumns)
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
    .limit(1)
  return row ?? null
}

export async function createRule(
  userId: string,
  input: RecurringRuleInput,
): Promise<RecurringRule> {
  const [row] = await db
    .insert(recurringRules)
    .values({ ...input, userId })
    .returning(ruleColumns)
  return row!
}

/**
 * Updates a rule. The generation cursor is kept, so already generated
 * occurrences stay untouched and the new schedule applies from there on.
 */
export async function updateRule(
  userId: string,
  id: string,
  input: RecurringRuleInput,
): Promise<RecurringRule | null> {
  const [row] = await db
    .update(recurringRules)
    .set(input)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
    .returning(ruleColumns)
  return row ?? null
}

export async function setRuleActive(
  userId: string,
  id: string,
  isActive: boolean,
): Promise<RecurringRule | null> {
  const [row] = await db
    .update(recurringRules)
    .set({ isActive })
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
    .returning(ruleColumns)
  return row ?? null
}

export async function deleteRule(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.id, id)))
    .returning({ id: recurringRules.id })
  return deleted.length > 0
}

export type UpcomingOccurrence = {
  ruleId: string
  label: string
  type: TransactionType
  amountMinor: number
  currency: string
  category: string
  date: DateOnly
  daysUntil: number
  reminderDaysBefore: number | null
  /** Inside the rule's reminder window. */
  dueSoon: boolean
}

/** Every occurrence of the user's active rules in the next `days` days. */
export async function listUpcoming(
  userId: string,
  today: DateOnly,
  days = 90,
): Promise<UpcomingOccurrence[]> {
  const rules = await db
    .select(ruleColumns)
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.isActive, true)))

  const until = addDays(today, days)
  return rules
    .flatMap((rule) =>
      occurrencesBetween(specOf(rule), today, until, 400).map((date) => {
        const daysUntil = diffInDays(today, date)
        return {
          ruleId: rule.id,
          label: rule.label,
          type: rule.type,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          category: rule.category,
          date,
          daysUntil,
          reminderDaysBefore: rule.reminderDaysBefore,
          dueSoon: rule.reminderDaysBefore !== null && daysUntil <= rule.reminderDaysBefore,
        }
      }),
    )
    .sort((a, b) => (a.date === b.date ? a.label.localeCompare(b.label) : a.date < b.date ? -1 : 1))
}

export type OpenReminder = {
  id: string
  ruleId: string
  label: string
  amountMinor: number
  currency: string
  type: TransactionType
  occurrenceDate: DateOnly
  remindOn: DateOnly
}

/** Undismissed reminders whose occurrence is today or later (or within the past week). */
export async function listOpenReminders(userId: string, today: DateOnly): Promise<OpenReminder[]> {
  return db
    .select({
      id: reminders.id,
      ruleId: reminders.ruleId,
      label: recurringRules.label,
      amountMinor: recurringRules.amountMinor,
      currency: recurringRules.currency,
      type: recurringRules.type,
      occurrenceDate: reminders.occurrenceDate,
      remindOn: reminders.remindOn,
    })
    .from(reminders)
    .innerJoin(recurringRules, eq(recurringRules.id, reminders.ruleId))
    .where(
      and(
        eq(reminders.userId, userId),
        isNull(reminders.dismissedAt),
        gte(reminders.occurrenceDate, addDays(today, -7)),
      ),
    )
    .orderBy(asc(reminders.occurrenceDate), asc(recurringRules.label))
}

export async function dismissReminder(userId: string, id: string): Promise<boolean> {
  const updated = await db
    .update(reminders)
    .set({ dismissedAt: new Date() })
    .where(and(eq(reminders.userId, userId), eq(reminders.id, id), isNull(reminders.dismissedAt)))
    .returning({ id: reminders.id })
  return updated.length > 0
}
