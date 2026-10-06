import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDb } from '@/server/db'
import { createRule, getRule } from '@/server/queries/recurring'
import { closeQueue } from '@/server/queue'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'

import {
  createRuleAction,
  deleteRuleAction,
  setRuleActiveAction,
  updateRuleAction,
} from './actions'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis(), closeQueue()])
})
beforeEach(() => resetRequest())

const form = {
  label: 'VPS',
  type: 'expense',
  amount: '12.49',
  currency: 'USD',
  category: 'Hosting',
  note: '',
  frequency: 'monthly',
  dayOfMonth: '31',
  monthOfYear: '',
  startsOn: '2026-10-01',
  endsOn: '',
  reminderDaysBefore: '',
}

describe('recurring rule actions', () => {
  it('require a session', async () => {
    await expect(createRuleAction(form)).rejects.toMatchObject({ location: '/login' })
  })

  it('create, pause, and delete the caller’s rule', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const created = await createRuleAction(form)
    if (!created.ok) throw new Error('create failed')
    expect(await getRule(user.id, created.data.id)).toMatchObject({
      amountMinor: 1249,
      dayOfMonth: 31,
    })

    expect(await setRuleActiveAction(created.data.id, false)).toEqual({ ok: true, data: undefined })
    expect(await getRule(user.id, created.data.id)).toMatchObject({ isActive: false })
    expect(await deleteRuleAction(created.data.id)).toEqual({ ok: true, data: undefined })
  })

  it('reject invalid input with field errors', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const result = await createRuleAction({ ...form, frequency: 'yearly', amount: '0' })
    expect(result).toMatchObject({ ok: false, error: 'invalid' })
    if (!result.ok)
      expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(['amount', 'monthOfYear'])
  })

  it('cannot touch another user’s rule', async () => {
    const owner = await createTestUser()
    const intruder = await createTestUser()
    const rule = await createRule(owner.id, {
      label: 'Domain',
      type: 'expense',
      amountMinor: 1800,
      currency: 'USD',
      category: 'Domains',
      note: null,
      frequency: 'monthly',
      dayOfMonth: 1,
      monthOfYear: null,
      startsOn: '2026-01-01',
      endsOn: null,
      reminderDaysBefore: null,
    })
    await signInAs(intruder.id)
    expect(await updateRuleAction(rule.id, form)).toEqual({ ok: false, error: 'not_found' })
    expect(await setRuleActiveAction(rule.id, false)).toEqual({ ok: false, error: 'not_found' })
    expect(await deleteRuleAction(rule.id)).toEqual({ ok: false, error: 'not_found' })
    expect(await getRule(owner.id, rule.id)).toMatchObject({ isActive: true, label: 'Domain' })
  })
})
