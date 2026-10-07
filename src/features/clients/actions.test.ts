import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDb } from '@/server/db'
import { listClients } from '@/server/queries/clients'
import { createCompany } from '@/server/queries/companies'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { RedirectError, resetRequest } from '@/server/testing/next-request'

import { createClientAction, deleteClientAction, updateClientAction } from './actions'
import { CLIENT_NAME_TAKEN } from './schema'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

const form = {
  name: 'Northwind Labs',
  address: 'Jl. Thamrin 10\nJakarta',
  email: 'ap@northwind.example',
  taxId: '',
}

async function signedInWithCompany() {
  const user = await createTestUser()
  await signInAs(user.id)
  const company = await createCompany(user.id, {
    name: 'Studio Rofiq',
    address: null,
    taxId: null,
    email: null,
    defaultCurrency: 'IDR',
    paymentDetails: null,
    invoicePrefix: 'SR-',
    nextInvoiceNumber: 1,
  })
  return { user, company }
}

describe('client actions', () => {
  it('validate input, then save a client with empty fields stored as null', async () => {
    const { user, company } = await signedInWithCompany()
    const invalid = await createClientAction(company.id, { ...form, name: '  ', email: 'nope' })
    expect(invalid).toMatchObject({ ok: false, error: 'invalid' })
    if (!invalid.ok)
      expect(Object.keys(invalid.fieldErrors ?? {}).sort()).toEqual(['email', 'name'])

    const created = await createClientAction(company.id, { ...form, name: '  Northwind Labs ' })
    expect(created.ok).toBe(true)
    expect(await listClients(user.id, company.id)).toMatchObject([
      { name: 'Northwind Labs', address: 'Jl. Thamrin 10\nJakarta', taxId: null },
    ])
  })

  it('report a duplicate name on the name field', async () => {
    const { company } = await signedInWithCompany()
    await createClientAction(company.id, form)
    expect(await createClientAction(company.id, { ...form, name: 'northwind labs' })).toEqual({
      ok: false,
      error: 'invalid',
      fieldErrors: { name: [CLIENT_NAME_TAKEN] },
    })

    const other = await createClientAction(company.id, { ...form, name: 'Acme' })
    if (!other.ok) throw new Error('setup')
    expect(await updateClientAction(other.data.id, form)).toEqual({
      ok: false,
      error: 'invalid',
      fieldErrors: { name: [CLIENT_NAME_TAKEN] },
    })
  })

  it('update and delete a client', async () => {
    const { user, company } = await signedInWithCompany()
    const created = await createClientAction(company.id, form)
    if (!created.ok) throw new Error('setup')

    expect(await updateClientAction(created.data.id, { ...form, email: '' })).toEqual({
      ok: true,
      data: undefined,
    })
    expect(await listClients(user.id, company.id)).toMatchObject([{ email: null }])
    expect(await deleteClientAction(created.data.id)).toEqual({ ok: true, data: undefined })
    expect(await deleteClientAction(created.data.id)).toEqual({ ok: false, error: 'not_found' })
  })

  it('treat malformed ids as not found', async () => {
    await signedInWithCompany()
    expect(await createClientAction('nope', form)).toEqual({
      ok: false,
      error: 'company_not_found',
    })
    expect(await updateClientAction(42, form)).toEqual({ ok: false, error: 'not_found' })
    expect(await deleteClientAction(null)).toEqual({ ok: false, error: 'not_found' })
  })

  it('never touch another user’s company or clients', async () => {
    const owner = await signedInWithCompany()
    const created = await createClientAction(owner.company.id, form)
    if (!created.ok) throw new Error('setup')

    const intruder = await createTestUser()
    await signInAs(intruder.id)
    expect(await createClientAction(owner.company.id, { ...form, name: 'Mine' })).toEqual({
      ok: false,
      error: 'company_not_found',
    })
    expect(await updateClientAction(created.data.id, { ...form, name: 'Mine' })).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await deleteClientAction(created.data.id)).toEqual({ ok: false, error: 'not_found' })
    expect(await listClients(owner.user.id, owner.company.id)).toMatchObject([
      { name: 'Northwind Labs' },
    ])
  })

  it('require a session', async () => {
    const { company } = await signedInWithCompany()
    resetRequest()
    await expect(createClientAction(company.id, form)).rejects.toThrow(RedirectError)
  })
})
