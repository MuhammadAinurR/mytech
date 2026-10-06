import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDb } from '@/server/db'
import { createTransaction, getTransaction } from '@/server/queries/transactions'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'

import {
  createTransactionAction,
  deleteTransactionAction,
  updateTransactionAction,
} from './actions'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

const form = {
  type: 'income',
  amount: '4,200.00',
  currency: 'USD',
  category: 'Retainer',
  occurredOn: '2026-10-06',
  note: 'October',
}

describe('transaction actions', () => {
  it('require a session', async () => {
    await expect(createTransactionAction(form)).rejects.toMatchObject({ location: '/login' })
    await expect(deleteTransactionAction(crypto.randomUUID())).rejects.toMatchObject({
      location: '/login',
    })
  })

  it('create from form input and return field errors for bad input', async () => {
    const user = await createTestUser()
    await signInAs(user.id)

    const created = await createTransactionAction(form)
    expect(created.ok).toBe(true)
    if (created.ok) {
      expect(await getTransaction(user.id, created.data.id)).toMatchObject({
        amountMinor: 420000,
        type: 'income',
      })
    }

    const invalid = await createTransactionAction({ ...form, amount: 'lots', occurredOn: 'soon' })
    expect(invalid).toMatchObject({ ok: false, error: 'invalid' })
    if (!invalid.ok)
      expect(Object.keys(invalid.fieldErrors ?? {}).sort()).toEqual(['amount', 'occurredOn'])
  })

  it('cannot update or delete another user’s transaction', async () => {
    const owner = await createTestUser()
    const intruder = await createTestUser()
    const target = await createTransaction(owner.id, {
      type: 'expense',
      amountMinor: 500,
      currency: 'USD',
      category: 'Software',
      occurredOn: '2026-10-01',
      note: null,
    })

    await signInAs(intruder.id)
    expect(await updateTransactionAction(target.id, form)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await deleteTransactionAction(target.id)).toEqual({ ok: false, error: 'not_found' })
    expect(await deleteTransactionAction('not-a-uuid')).toEqual({ ok: false, error: 'not_found' })
    expect(await getTransaction(owner.id, target.id)).toMatchObject({ amountMinor: 500 })
  })

  it('update and delete the caller’s own transaction', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const created = await createTransactionAction(form)
    if (!created.ok) throw new Error('setup failed')

    expect(await updateTransactionAction(created.data.id, { ...form, amount: '10' })).toEqual({
      ok: true,
      data: undefined,
    })
    expect(await getTransaction(user.id, created.data.id)).toMatchObject({ amountMinor: 1000 })
    expect(await deleteTransactionAction(created.data.id)).toEqual({ ok: true, data: undefined })
    expect(await getTransaction(user.id, created.data.id)).toBeNull()
  })
})
