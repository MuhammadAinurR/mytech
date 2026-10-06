import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDb } from '@/server/db'
import { createCredential, getCredential } from '@/server/queries/credentials'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'

import {
  createCredentialAction,
  deleteCredentialAction,
  revealSecretAction,
  updateCredentialAction,
} from './actions'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

const form = {
  label: 'Registrar',
  type: 'domain',
  host: 'registrar.example',
  username: 'rofiq',
  notes: '',
  secret: 'registrar-password',
}

describe('credential actions', () => {
  it('require a session', async () => {
    await expect(revealSecretAction(crypto.randomUUID())).rejects.toMatchObject({
      location: '/login',
    })
  })

  it('create requires a secret; edit can leave it blank', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const missing = await createCredentialAction({ ...form, secret: '' })
    expect(missing).toMatchObject({ ok: false, fieldErrors: { secret: ['Enter the secret.'] } })

    const created = await createCredentialAction(form)
    if (!created.ok) throw new Error('create failed')
    expect(
      await updateCredentialAction(created.data.id, {
        ...form,
        label: 'Registrar (old)',
        secret: '',
      }),
    ).toEqual({
      ok: true,
      data: undefined,
    })
    expect(await revealSecretAction(created.data.id)).toEqual({
      ok: true,
      data: { secret: 'registrar-password' },
    })
  })

  it('rate limits reveals per user', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const created = await createCredential(user.id, {
      ...form,
      type: 'domain',
      notes: null,
      secret: 's',
    })
    for (let i = 0; i < 30; i++) {
      expect((await revealSecretAction(created.id, 'copy')).ok).toBe(true)
    }
    expect(await revealSecretAction(created.id)).toEqual({ ok: false, error: 'rate_limited' })
  })

  it('rejects unknown purposes and other users’ credentials', async () => {
    const owner = await createTestUser()
    const intruder = await createTestUser()
    const target = await createCredential(owner.id, { ...form, type: 'domain', notes: null })
    await signInAs(intruder.id)
    expect(await revealSecretAction(target.id)).toEqual({ ok: false, error: 'not_found' })
    expect(await revealSecretAction(target.id, 'export')).toEqual({ ok: false, error: 'not_found' })
    expect(await updateCredentialAction(target.id, form)).toEqual({ ok: false, error: 'not_found' })
    expect(await deleteCredentialAction(target.id)).toEqual({ ok: false, error: 'not_found' })
    expect(await getCredential(owner.id, target.id)).toMatchObject({ label: 'Registrar' })
  })
})
