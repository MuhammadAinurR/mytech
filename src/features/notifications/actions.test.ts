import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { closeDb } from '@/server/db'
import type * as PushModule from '@/server/push'
import { findPushDevice, listPushDevices } from '@/server/queries/push'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { request, resetRequest } from '@/server/testing/next-request'

import {
  disablePushAction,
  enablePushAction,
  pushDeviceStatusAction,
  removePushDeviceAction,
  sendTestPushAction,
} from './actions'

// Never reach a real push service from tests.
vi.mock('@/server/push', async (importOriginal) => ({
  ...(await importOriginal<typeof PushModule>()),
  sendPush: vi.fn(async () => 'sent' as const),
}))

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

const subscription = () => ({
  endpoint: `https://web.push.apple.com/${crypto.randomUUID()}`,
  expirationTime: null,
  keys: {
    p256dh:
      'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
    auth: 'tBHItJI5svbpez7KI4CCXg',
  },
})

async function signedIn() {
  const user = await createTestUser()
  await signInAs(user.id)
  return user
}

describe('push actions', () => {
  it('save this device with a label from its browser, and report its status', async () => {
    const user = await signedIn()
    request.headers.set(
      'user-agent',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    )
    const device = subscription()
    expect(await pushDeviceStatusAction(device.endpoint)).toEqual({
      ok: true,
      data: { registered: false },
    })
    expect(await enablePushAction(device)).toEqual({ ok: true, data: undefined })
    expect(await listPushDevices(user.id)).toMatchObject([{ label: 'iPhone · Safari' }])
    expect(await pushDeviceStatusAction(device.endpoint)).toEqual({
      ok: true,
      data: { registered: true },
    })

    expect(await disablePushAction(device.endpoint)).toEqual({ ok: true, data: undefined })
    expect(await listPushDevices(user.id)).toEqual([])
  })

  it('reject subscriptions that aren’t https or are missing keys', async () => {
    await signedIn()
    const device = subscription()
    for (const bad of [
      { ...device, endpoint: 'http://push.example/x' },
      { ...device, keys: { p256dh: device.keys.p256dh } },
      { ...device, keys: { ...device.keys, auth: 'not base64!' } },
      'nope',
    ]) {
      expect(await enablePushAction(bad)).toEqual({ ok: false, error: 'invalid' })
    }
  })

  it('send a test notification, rate limited, and say when there is nowhere to send it', async () => {
    await signedIn()
    expect(await sendTestPushAction()).toEqual({ ok: false, error: 'no_devices' })
    await enablePushAction(subscription())
    for (let i = 0; i < 4; i++) {
      expect(await sendTestPushAction()).toEqual({ ok: true, data: { sent: 1 } })
    }
    expect(await sendTestPushAction()).toEqual({ ok: false, error: 'rate_limited' })
  })

  it('never touch another user’s devices', async () => {
    const owner = await signedIn()
    const device = subscription()
    await enablePushAction(device)
    const [saved] = await listPushDevices(owner.id)

    await signedIn()
    expect(await pushDeviceStatusAction(device.endpoint)).toEqual({
      ok: true,
      data: { registered: false },
    })
    expect(await disablePushAction(device.endpoint)).toEqual({ ok: false, error: 'not_found' })
    expect(await removePushDeviceAction(saved!.id)).toEqual({ ok: false, error: 'not_found' })
    expect(await removePushDeviceAction('nope')).toEqual({ ok: false, error: 'not_found' })
    expect(await findPushDevice(owner.id, device.endpoint)).toBe(saved!.id)
  })
})
