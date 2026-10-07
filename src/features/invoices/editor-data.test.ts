import { describe, expect, it } from 'vitest'

import type { CurrentUser } from '@/server/queries/users'

import { newInvoiceDefaults } from './editor-data'
import { billTo, type CompanyOption, findClientByName } from './editor-shared'

const northwind = {
  id: 'c1',
  name: 'Northwind Labs',
  address: 'Jl. Thamrin 10',
  email: 'ap@northwind.example',
  taxId: '01.234',
}
const acme = { id: 'c2', name: 'Acme', address: '', email: '', taxId: '' }

const studio: CompanyOption = {
  id: 'studio',
  name: 'Studio Rofiq',
  defaultCurrency: 'IDR',
  nextLabel: 'SR-0001',
  clients: [acme, northwind],
}
const labs: CompanyOption = {
  id: 'labs',
  name: 'Rofiq Labs',
  defaultCurrency: 'USD',
  nextLabel: 'INV-0001',
  clients: [],
}

const user = {
  id: 'u1',
  timezone: 'Asia/Jakarta',
  defaultCurrency: 'USD',
} as CurrentUser

describe('newInvoiceDefaults', () => {
  it('fills "Bill to" from a client in the URL, and picks its company', () => {
    const values = newInvoiceDefaults(user, [studio, labs], { clientId: 'c1' })
    expect(values).toMatchObject({
      companyId: 'studio',
      currency: 'IDR',
      clientName: 'Northwind Labs',
      clientAddress: 'Jl. Thamrin 10',
      clientEmail: 'ap@northwind.example',
      clientTaxId: '01.234',
      saveClient: false,
    })
  })

  it('ignores a client that belongs to a different company than the one given', () => {
    const values = newInvoiceDefaults(user, [studio, labs], { companyId: 'labs', clientId: 'c1' })
    expect(values).toMatchObject({ companyId: 'labs', currency: 'USD', clientName: '' })
  })

  it('leaves "Bill to" blank without a client, and the company unset if there are several', () => {
    expect(newInvoiceDefaults(user, [studio, labs])).toMatchObject({
      companyId: '',
      currency: 'USD',
      ...billTo(undefined),
    })
    expect(newInvoiceDefaults(user, [labs])).toMatchObject({ companyId: 'labs' })
  })
})

describe('findClientByName', () => {
  it('matches ignoring case and surrounding spaces, and never matches a blank name', () => {
    expect(findClientByName(studio.clients, '  northwind LABS ')).toBe(northwind)
    expect(findClientByName(studio.clients, 'Northwind')).toBeUndefined()
    expect(findClientByName(studio.clients, '   ')).toBeUndefined()
  })
})
