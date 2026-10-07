import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDb } from '@/server/db'
import { listClients } from '@/server/queries/clients'
import { createCompany } from '@/server/queries/companies'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'

import { createInvoiceAction, updateInvoiceAction } from './actions'
import { type InvoiceFormValues } from './schema'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

async function signedInWithCompany() {
  const user = await createTestUser()
  await signInAs(user.id)
  const company = await createCompany(user.id, {
    name: 'Studio Rofiq',
    address: null,
    taxId: null,
    email: null,
    defaultCurrency: 'USD',
    paymentDetails: null,
    invoicePrefix: 'SR-',
    nextInvoiceNumber: 1,
  })
  return { user, company }
}

const values = (companyId: string, overrides: Partial<InvoiceFormValues> = {}) => ({
  companyId,
  issueDate: '2026-10-08',
  dueDate: '2026-10-22',
  currency: 'USD' as const,
  clientName: 'Northwind Labs',
  clientAddress: 'Jl. Thamrin 10',
  clientEmail: '',
  clientTaxId: '',
  notes: '',
  taxRate: '',
  discount: '',
  items: [{ description: 'Design', quantity: '1', unitPrice: '1,250.00' }],
  ...overrides,
})

describe('invoice actions saving the client', () => {
  it('save the "Bill to" details as a client only when asked', async () => {
    const { user, company } = await signedInWithCompany()
    const plain = await createInvoiceAction(values(company.id))
    expect(plain).toMatchObject({ ok: true, data: { numberLabel: 'SR-0001', savedClient: false } })
    expect(await listClients(user.id, company.id)).toEqual([])

    const saved = await createInvoiceAction(values(company.id, { saveClient: true }))
    expect(saved).toMatchObject({ ok: true, data: { savedClient: true } })
    expect(await listClients(user.id, company.id)).toMatchObject([
      { name: 'Northwind Labs', address: 'Jl. Thamrin 10', email: null, taxId: null },
    ])
  })

  it('save the client from a draft being edited', async () => {
    const { user, company } = await signedInWithCompany()
    const created = await createInvoiceAction(values(company.id))
    if (!created.ok) throw new Error('setup')
    expect(
      await updateInvoiceAction(
        created.data.id,
        values(company.id, { clientName: 'Acme', saveClient: true }),
      ),
    ).toEqual({ ok: true, data: { savedClient: true } })
    expect((await listClients(user.id, company.id)).map((c) => c.name)).toEqual(['Acme'])
  })

  it('reject a non-boolean saveClient', async () => {
    const { company } = await signedInWithCompany()
    expect(await createInvoiceAction({ ...values(company.id), saveClient: 'yes' })).toMatchObject({
      ok: false,
      error: 'invalid',
    })
  })
})
