import 'server-only'

import { and, asc, eq, isNotNull } from 'drizzle-orm'

import { nextOccurrence, occurrencesBetween } from '@/features/recurring/lib/recurrence'
import { addDays, diffInDays, todayInTimeZone } from '@/lib/dates'

import { db } from '../db'
import { recurringRules, reminders, transactions, users } from '../db/schema'
import { logger } from '../logger'

/** Most occurrences one run creates per rule; a long backlog drains over runs. */
export const MAX_OCCURRENCES_PER_RUN = 60

/**
 * Creates the transactions a rule owes up to "today" in its owner's timezone.
 * Idempotent: a unique (rule, occurrence_date) index plus ON CONFLICT DO
 * NOTHING mean reruns, retries, and concurrent workers never duplicate. The
 * rule row is locked for the duration so concurrent runs queue up instead of
 * doing the same work twice.
 */
export async function generateForRule(
  ruleId: string,
  now: Date = new Date(),
): Promise<{ created: number }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ rule: recurringRules, timezone: users.timezone })
      .from(recurringRules)
      .innerJoin(users, eq(users.id, recurringRules.userId))
      .where(and(eq(recurringRules.id, ruleId), eq(recurringRules.isActive, true)))
      .for('update', { of: recurringRules })
    if (!row) return { created: 0 }

    const { rule, timezone } = row
    const today = todayInTimeZone(timezone, now)
    const from = rule.generatedThrough ? addDays(rule.generatedThrough, 1) : rule.startsOn
    const until = rule.endsOn && rule.endsOn < today ? rule.endsOn : today
    if (from > until) return { created: 0 }

    const dates = occurrencesBetween(rule, from, until, MAX_OCCURRENCES_PER_RUN)
    let created = 0
    if (dates.length > 0) {
      const inserted = await tx
        .insert(transactions)
        .values(
          dates.map((date) => ({
            userId: rule.userId,
            type: rule.type,
            amountMinor: rule.amountMinor,
            currency: rule.currency,
            category: rule.category,
            note: rule.note ?? rule.label,
            occurredOn: date,
            recurringRuleId: rule.id,
            occurrenceDate: date,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: transactions.id })
      created = inserted.length
    }

    // A full batch may have more behind it: advance only to the last date handled.
    const cursor = dates.length === MAX_OCCURRENCES_PER_RUN ? dates.at(-1)! : until
    await tx
      .update(recurringRules)
      .set({ generatedThrough: cursor })
      .where(eq(recurringRules.id, rule.id))

    if (created > 0) logger.info({ ruleId: rule.id, created }, 'generated recurring transactions')
    return { created }
  })
}

/** Runs generation for every active rule. Failures are isolated per rule. */
export async function generateAllDue(
  now: Date = new Date(),
): Promise<{ rules: number; created: number; failed: number }> {
  const active = await db
    .select({ id: recurringRules.id })
    .from(recurringRules)
    .where(eq(recurringRules.isActive, true))
    .orderBy(asc(recurringRules.id))

  let created = 0
  let failed = 0
  for (const { id } of active) {
    try {
      created += (await generateForRule(id, now)).created
    } catch (error) {
      failed += 1
      logger.error({ err: error, ruleId: id }, 'recurring generation failed for rule')
    }
  }
  return { rules: active.length, created, failed }
}

/**
 * Creates a reminder for each active rule whose next occurrence is inside its
 * lead time. Idempotent through the unique (rule, occurrence) index.
 */
export async function createDueReminders(now: Date = new Date()): Promise<{ created: number }> {
  const rows = await db
    .select({ rule: recurringRules, timezone: users.timezone })
    .from(recurringRules)
    .innerJoin(users, eq(users.id, recurringRules.userId))
    .where(and(eq(recurringRules.isActive, true), isNotNull(recurringRules.reminderDaysBefore)))

  const due = rows.flatMap(({ rule, timezone }) => {
    const today = todayInTimeZone(timezone, now)
    const next = nextOccurrence(rule, today)
    const lead = rule.reminderDaysBefore ?? 0
    if (!next || diffInDays(today, next) > lead) return []
    return [
      {
        userId: rule.userId,
        ruleId: rule.id,
        occurrenceDate: next,
        remindOn: addDays(next, -lead),
      },
    ]
  })
  if (due.length === 0) return { created: 0 }

  const inserted = await db
    .insert(reminders)
    .values(due)
    .onConflictDoNothing()
    .returning({ id: reminders.id })
  if (inserted.length > 0) logger.info({ created: inserted.length }, 'created reminders')
  return { created: inserted.length }
}
