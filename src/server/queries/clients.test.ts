import { afterAll, describe, expect, it } from 'vitest'

import { type ClientInput } from '@/features/clients/schema'
import { type CompanyInput } from '@/features/companies/schema'

import { closeDb } from '../db'
import { createTestUser } from '../testing/factories'
import { createClient, deleteClient, listAllClients, listClients, updateClient } from './clients'
import { createCompany, deleteCompany, listCompanies } from './companies'

afterAll(closeDb)

const company = (name: string): CompanyInput => ({
  name,
  address: null,
  taxId: null,
  email: null,
  defaultCurrency: 'USD',
  paymentDetails: null,
  invoicePrefix: 'INV-',
  nextInvoiceNumber: 1,
})

const client = (overrides: Partial<ClientInput> = {}): ClientInput => ({
  name: 'Northwind Labs',
  address: 'Jl. Thamrin 10\nJakarta',
  email: 'ap@northwind.example',
  taxId: '01.234.567.8-901.000',
  ...overrides,
})

async function setup() {
  const user = await createTestUser()
  const studio = await createCompany(user.id, company('Studio Rofiq'))
  const labs = await createCompany(user.id, company('Rofiq Labs'))
  return { user, studio, labs }
}

describe('saved clients', () => {
  it('lists a company’s clients alphabetically, ignoring case', async () => {
    const { user, studio, labs } = await setup()
    for (const name of ['northwind Labs', 'Acme', 'Bluebird']) {
      await createClient(user.id, studio.id, client({ name }))
    }
    await createClient(user.id, labs.id, client({ name: 'Elsewhere' }))

    expect((await listClients(user.id, studio.id)).map((c) => c.name)).toEqual([
      'Acme',
      'Bluebird',
      'northwind Labs',
    ])
    const all = await listAllClients(user.id)
    expect(all).toHaveLength(4)
    expect(all.filter((c) => c.companyId === labs.id).map((c) => c.name)).toEqual(['Elsewhere'])
  })

  it('creates, updates, and deletes a client', async () => {
    const { user, studio } = await setup()
    const created = await createClient(user.id, studio.id, client())
    if (!created.ok) throw new Error('create failed')
    expect(created.data).toMatchObject({ companyId: studio.id, name: 'Northwind Labs' })

    const updated = await updateClient(
      user.id,
      created.data.id,
      client({ address: null, email: 'finance@northwind.example' }),
    )
    expect(updated).toMatchObject({
      ok: true,
      data: { address: null, email: 'finance@northwind.example' },
    })

    expect(await deleteClient(user.id, created.data.id)).toEqual({ companyId: studio.id })
    expect(await deleteClient(user.id, created.data.id)).toBeNull()
    expect(await listClients(user.id, studio.id)).toEqual([])
  })

  it('refuses a second client with the same name in one company, but not in another', async () => {
    const { user, studio, labs } = await setup()
    const first = await createClient(user.id, studio.id, client())
    expect(await createClient(user.id, studio.id, client({ name: 'NORTHWIND LABS' }))).toEqual({
      ok: false,
      error: 'name_taken',
    })
    expect((await createClient(user.id, labs.id, client())).ok).toBe(true)

    const second = await createClient(user.id, studio.id, client({ name: 'Acme' }))
    if (!first.ok || !second.ok) throw new Error('setup')
    expect(await updateClient(user.id, second.data.id, client({ name: 'northwind labs' }))).toEqual(
      {
        ok: false,
        error: 'name_taken',
      },
    )
  })

  it('counts clients per company, and they go when the company does', async () => {
    const { user, studio, labs } = await setup()
    await createClient(user.id, studio.id, client())
    await createClient(user.id, studio.id, client({ name: 'Acme' }))

    const counts = Object.fromEntries(
      (await listCompanies(user.id)).map((c) => [c.name, [c.clientCount, c.invoiceCount]]),
    )
    expect(counts).toEqual({ 'Studio Rofiq': [2, 0], 'Rofiq Labs': [0, 0] })

    expect((await deleteCompany(user.id, studio.id)).ok).toBe(true)
    expect(await listAllClients(user.id)).toEqual([])
    expect((await listCompanies(user.id)).map((c) => c.id)).toEqual([labs.id])
  })
})

describe('saved client isolation', () => {
  it('keeps clients private and blocks saving them to someone else’s company', async () => {
    const { user, studio } = await setup()
    const created = await createClient(user.id, studio.id, client())
    if (!created.ok) throw new Error('setup')
    const intruder = await createTestUser()

    expect(await listClients(intruder.id, studio.id)).toEqual([])
    expect(await listAllClients(intruder.id)).toEqual([])
    expect(await createClient(intruder.id, studio.id, client({ name: 'Mine now' }))).toEqual({
      ok: false,
      error: 'company_not_found',
    })
    expect(await updateClient(intruder.id, created.data.id, client({ name: 'Taken' }))).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await deleteClient(intruder.id, created.data.id)).toBeNull()

    expect(await listClients(user.id, studio.id)).toEqual([created.data])
  })
})
