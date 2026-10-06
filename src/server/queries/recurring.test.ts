import { afterAll, describe, expect, it } from 'vitest'

import { type RecurringRuleInput } from '@/features/recurring/schema'

import { closeDb, db } from '../db'
import { reminders } from '../db/schema'
import { createTestUser } from '../testing/factories'
import {
  createRule,
  deleteRule,
  dismissReminder,
  getRule,
  listOpenReminders,
  listRules,
  listUpcoming,
  setRuleActive,
  updateRule,
} from './recurring'

afterAll(closeDb)

const rule = (overrides: Partial<RecurringRuleInput> = {}): RecurringRuleInput => ({
  label: 'Domain',
  type: 'expense',
  amountMinor: 1800,
  currency: 'USD',
  category: 'Domains',
  note: null,
  frequency: 'yearly',
  dayOfMonth: 20,
  monthOfYear: 10,
  startsOn: '2026-01-01',
  endsOn: null,
  reminderDaysBefore: 14,
  ...overrides,
})

describe('recurring rules data access', () => {
  it('lists rules with their next occurrence, active and soonest first', async () => {
    const user = await createTestUser()
    await createRule(user.id, rule({ label: 'Later', monthOfYear: 12 }))
    await createRule(user.id, rule({ label: 'Sooner', monthOfYear: 11 }))
    const paused = await createRule(user.id, rule({ label: 'Paused' }))
    await setRuleActive(user.id, paused.id, false)

    const rules = await listRules(user.id, '2026-10-07')
    expect(rules.map((r) => [r.label, r.nextOn])).toEqual([
      ['Sooner', '2026-11-20'],
      ['Later', '2026-12-20'],
      ['Paused', null],
    ])
  })

  it('lists upcoming occurrences and flags those inside the reminder window', async () => {
    const user = await createTestUser()
    await createRule(user.id, rule({ label: 'Domain', monthOfYear: 10, dayOfMonth: 17 }))
    await createRule(
      user.id,
      rule({
        label: 'VPS',
        frequency: 'monthly',
        monthOfYear: null,
        dayOfMonth: 31,
        reminderDaysBefore: null,
      }),
    )

    const upcoming = await listUpcoming(user.id, '2026-10-07', 60)
    expect(upcoming.map((o) => [o.label, o.date, o.daysUntil, o.dueSoon])).toEqual([
      ['Domain', '2026-10-17', 10, true],
      ['VPS', '2026-10-31', 24, false],
      ['VPS', '2026-11-30', 54, false],
    ])
  })
})

describe('recurring rules isolation', () => {
  it('keeps rules and reminders private to their owner', async () => {
    const owner = await createTestUser()
    const intruder = await createTestUser()
    const mine = await createRule(owner.id, rule())
    const [reminder] = await db
      .insert(reminders)
      .values({
        userId: owner.id,
        ruleId: mine.id,
        occurrenceDate: '2026-10-20',
        remindOn: '2026-10-06',
      })
      .returning()

    expect(await getRule(intruder.id, mine.id)).toBeNull()
    expect(await listRules(intruder.id, '2026-10-07')).toEqual([])
    expect(await listUpcoming(intruder.id, '2026-10-07')).toEqual([])
    expect(await listOpenReminders(intruder.id, '2026-10-07')).toEqual([])
    expect(await updateRule(intruder.id, mine.id, rule({ amountMinor: 1 }))).toBeNull()
    expect(await setRuleActive(intruder.id, mine.id, false)).toBeNull()
    expect(await dismissReminder(intruder.id, reminder!.id)).toBe(false)
    expect(await deleteRule(intruder.id, mine.id)).toBe(false)

    expect(await getRule(owner.id, mine.id)).toMatchObject({ amountMinor: 1800, isActive: true })
    expect(await listOpenReminders(owner.id, '2026-10-07')).toHaveLength(1)
    expect(await dismissReminder(owner.id, reminder!.id)).toBe(true)
    expect(await listOpenReminders(owner.id, '2026-10-07')).toEqual([])
  })
})
