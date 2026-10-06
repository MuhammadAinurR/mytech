import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { type RecurringRuleInput } from '@/features/recurring/schema'

import { closeDb, db } from '../db'
import { reminders, transactions } from '../db/schema'
import { createRule, setRuleActive } from '../queries/recurring'
import { createTestUser } from '../testing/factories'
import {
  createDueReminders,
  generateAllDue,
  generateForRule,
  MAX_OCCURRENCES_PER_RUN,
} from './recurring'

afterAll(closeDb)

const rule = (overrides: Partial<RecurringRuleInput> = {}): RecurringRuleInput => ({
  label: 'VPS',
  type: 'expense',
  amountMinor: 1249,
  currency: 'USD',
  category: 'Hosting',
  note: null,
  frequency: 'monthly',
  dayOfMonth: 31,
  monthOfYear: null,
  startsOn: '2026-01-01',
  endsOn: null,
  reminderDaysBefore: null,
  ...overrides,
})

async function generatedDates(ruleId: string) {
  const rows = await db
    .select({ occurredOn: transactions.occurredOn })
    .from(transactions)
    .where(eq(transactions.recurringRuleId, ruleId))
    .orderBy(transactions.occurredOn)
  return rows.map((r) => r.occurredOn)
}

describe('generateForRule', () => {
  it('catches up past occurrences with month-end clamping and is idempotent', async () => {
    const user = await createTestUser()
    const created = await createRule(user.id, rule())
    const now = new Date('2026-04-15T12:00:00Z')

    expect(await generateForRule(created.id, now)).toEqual({ created: 3 })
    expect(await generatedDates(created.id)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])

    // Reruns, retries, and duplicated jobs create nothing new.
    expect(await generateForRule(created.id, now)).toEqual({ created: 0 })
    expect(await generateForRule(created.id, now)).toEqual({ created: 0 })

    expect(await generateForRule(created.id, new Date('2026-05-01T12:00:00Z'))).toEqual({
      created: 1,
    })
    expect((await generatedDates(created.id)).at(-1)).toBe('2026-04-30')
  })

  it('copies the template and links each entry to its occurrence', async () => {
    const user = await createTestUser()
    const created = await createRule(user.id, rule({ dayOfMonth: 5, label: 'Hetzner box' }))
    await generateForRule(created.id, new Date('2026-01-10T00:00:00Z'))
    const [row] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.recurringRuleId, created.id))
    expect(row).toMatchObject({
      userId: user.id,
      type: 'expense',
      amountMinor: 1249,
      category: 'Hosting',
      note: 'Hetzner box',
      occurredOn: '2026-01-05',
      occurrenceDate: '2026-01-05',
    })
  })

  it('uses the owner’s timezone to decide whether today’s occurrence is due', async () => {
    const instant = new Date('2026-10-06T18:00:00Z') // Oct 7, 01:00 in Jakarta
    const jakarta = await createTestUser({ timezone: 'Asia/Jakarta' })
    const utc = await createTestUser({ timezone: 'UTC' })
    const spec = rule({ dayOfMonth: 7, startsOn: '2026-10-01' })
    const a = await createRule(jakarta.id, spec)
    const b = await createRule(utc.id, spec)

    expect(await generateForRule(a.id, instant)).toEqual({ created: 1 })
    expect(await generateForRule(b.id, instant)).toEqual({ created: 0 })
  })

  it('never duplicates under concurrent runs', async () => {
    const user = await createTestUser()
    const created = await createRule(user.id, rule({ dayOfMonth: 1 }))
    const now = new Date('2026-06-15T00:00:00Z')
    const results = await Promise.all(
      Array.from({ length: 5 }, () => generateForRule(created.id, now)),
    )
    expect(results.reduce((sum, r) => sum + r.created, 0)).toBe(6)
    expect(await generatedDates(created.id)).toHaveLength(6)
  })

  it('drains a long backlog in capped batches', async () => {
    const user = await createTestUser()
    const created = await createRule(user.id, rule({ dayOfMonth: 1, startsOn: '2010-01-01' }))
    const now = new Date('2026-01-15T00:00:00Z')
    // Jan 2010 through Jan 2026 is 193 monthly occurrences: 60 + 60 + 60 + 13.
    for (let run = 0; run < 3; run++) {
      expect(await generateForRule(created.id, now)).toEqual({ created: MAX_OCCURRENCES_PER_RUN })
    }
    expect(await generateForRule(created.id, now)).toEqual({ created: 13 })
    expect(await generateForRule(created.id, now)).toEqual({ created: 0 })
    expect(await generatedDates(created.id)).toHaveLength(193)
  })

  it('stops at the end date and skips paused rules', async () => {
    const user = await createTestUser()
    const ending = await createRule(user.id, rule({ dayOfMonth: 1, endsOn: '2026-02-15' }))
    expect(await generateForRule(ending.id, new Date('2026-12-01T00:00:00Z'))).toEqual({
      created: 2,
    })

    const paused = await createRule(user.id, rule({ dayOfMonth: 1 }))
    await setRuleActive(user.id, paused.id, false)
    expect(await generateForRule(paused.id, new Date('2026-12-01T00:00:00Z'))).toEqual({
      created: 0,
    })
  })

  it('waits for rules that start in the future', async () => {
    const user = await createTestUser()
    const later = await createRule(user.id, rule({ startsOn: '2027-01-01' }))
    expect(await generateForRule(later.id, new Date('2026-12-31T00:00:00Z'))).toEqual({
      created: 0,
    })
  })
})

describe('generateAllDue', () => {
  it('processes every active rule', async () => {
    const user = await createTestUser()
    // Far in the past so other test files' rules have nothing due.
    const a = await createRule(
      user.id,
      rule({ dayOfMonth: 1, startsOn: '1999-01-01', endsOn: '1999-03-31' }),
    )
    const result = await generateAllDue(new Date('1999-12-31T00:00:00Z'))
    expect(result.failed).toBe(0)
    expect(await generatedDates(a.id)).toEqual(['1999-01-01', '1999-02-01', '1999-03-01'])
  })
})

describe('createDueReminders', () => {
  it('creates one reminder inside the lead time and none outside it', async () => {
    const user = await createTestUser()
    const soon = await createRule(
      user.id,
      rule({
        frequency: 'yearly',
        monthOfYear: 10,
        dayOfMonth: 17,
        reminderDaysBefore: 14,
      }),
    )
    const later = await createRule(
      user.id,
      rule({
        frequency: 'yearly',
        monthOfYear: 10,
        dayOfMonth: 17,
        reminderDaysBefore: 3,
      }),
    )
    const now = new Date('2026-10-07T12:00:00Z')

    await createDueReminders(now)
    await createDueReminders(now)

    const forSoon = await db.select().from(reminders).where(eq(reminders.ruleId, soon.id))
    expect(forSoon).toHaveLength(1)
    expect(forSoon[0]).toMatchObject({ occurrenceDate: '2026-10-17', remindOn: '2026-10-03' })
    expect(await db.select().from(reminders).where(eq(reminders.ruleId, later.id))).toEqual([])
  })
})
