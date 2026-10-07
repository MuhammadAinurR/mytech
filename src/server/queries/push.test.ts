import { afterAll, describe, expect, it, vi } from 'vitest'

import { closeDb } from '../db'
import type { PushOutcome, PushTarget } from '../push'
import { createTestUser } from '../testing/factories'
import {
  deletePushDevice,
  deletePushEndpoint,
  findPushDevice,
  listPushDevices,
  pushToUser,
  savePushSubscription,
} from './push'

afterAll(closeDb)

const KEYS = {
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
  auth: 'tBHItJI5svbpez7KI4CCXg',
}
const endpoint = () => `https://push.example/send/${crypto.randomUUID()}`
const message = {
  title: 'INV-0001 is due today',
  body: 'Northwind Labs',
  url: '/invoices',
  tag: 't',
}

describe('push devices', () => {
  it('saves a device, and moves it when another account turns it on', async () => {
    const user = await createTestUser()
    const other = await createTestUser()
    const url = endpoint()
    const { id } = await savePushSubscription(user.id, {
      endpoint: url,
      ...KEYS,
      label: 'Mac · Safari',
    })
    expect(await findPushDevice(user.id, url)).toBe(id)
    expect(await listPushDevices(user.id)).toMatchObject([{ id, label: 'Mac · Safari' }])

    // Same browser, someone else signed in.
    await savePushSubscription(other.id, { endpoint: url, ...KEYS, label: 'Mac · Safari' })
    expect(await listPushDevices(user.id)).toEqual([])
    expect(await findPushDevice(other.id, url)).toBe(id)
  })

  it('removes devices only for their owner', async () => {
    const user = await createTestUser()
    const intruder = await createTestUser()
    const url = endpoint()
    const { id } = await savePushSubscription(user.id, { endpoint: url, ...KEYS, label: null })
    expect(await deletePushDevice(intruder.id, id)).toBe(false)
    expect(await deletePushEndpoint(intruder.id, url)).toBe(false)
    expect(await findPushDevice(intruder.id, url)).toBeNull()
    expect(await deletePushEndpoint(user.id, url)).toBe(true)
    expect(await listPushDevices(user.id)).toEqual([])
  })
})

describe('pushToUser', () => {
  it('sends to each device, drops gone ones, and records deliveries', async () => {
    const user = await createTestUser()
    const [ok, gone, flaky] = [endpoint(), endpoint(), endpoint()]
    for (const url of [ok, gone, flaky]) {
      await savePushSubscription(user.id, { endpoint: url, ...KEYS, label: null })
    }
    const outcomes: Record<string, PushOutcome> = {
      [ok]: 'sent',
      [gone]: 'gone',
      [flaky]: 'failed',
    }
    const send = vi.fn(async (target: PushTarget) => outcomes[target.endpoint]!)

    expect(await pushToUser(user.id, message, send)).toEqual({ sent: 1, gone: 1, failed: 1 })
    expect(send).toHaveBeenCalledTimes(3)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ endpoint: ok }), message)

    const devices = await listPushDevices(user.id)
    expect(devices).toHaveLength(2)
    const byId = Object.fromEntries(devices.map((d) => [d.id, d]))
    expect(byId[(await findPushDevice(user.id, ok))!]?.lastSuccessAt).toBeInstanceOf(Date)
    expect(byId[(await findPushDevice(user.id, flaky))!]?.lastSuccessAt).toBeNull()
    expect(await findPushDevice(user.id, gone)).toBeNull()
  })

  it('does nothing for a user without devices', async () => {
    const user = await createTestUser()
    const send = vi.fn()
    expect(await pushToUser(user.id, message, send)).toEqual({ sent: 0, gone: 0, failed: 0 })
    expect(send).not.toHaveBeenCalled()
  })
})
