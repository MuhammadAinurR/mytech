import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { GET as getLogo } from '@/app/api/companies/[id]/logo/route'
import { closeDb } from '@/server/db'
import { getCompany, getCompanyLogo } from '@/server/queries/companies'
import { closeRedis } from '@/server/redis'
import { createTestUser, signInAs } from '@/server/testing/factories'
import { resetRequest } from '@/server/testing/next-request'

import { createCompanyAction, removeCompanyLogoAction, uploadCompanyLogoAction } from './actions'

afterAll(async () => {
  await Promise.all([closeDb(), closeRedis()])
})
beforeEach(() => resetRequest())

const form = {
  name: 'Studio Rofiq',
  address: '',
  taxId: '',
  email: 'billing@studio.example',
  defaultCurrency: 'IDR',
  paymentDetails: '',
  invoicePrefix: 'SR-',
  nextInvoiceNumber: '100',
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])

function upload(bytes: Uint8Array, name = 'logo.png', type = 'image/png') {
  const data = new FormData()
  data.set('logo', new File([Uint8Array.from(bytes)], name, { type }))
  return data
}

const logoRequest = (id: string) =>
  getLogo(new Request(`http://localhost/api/companies/${id}/logo`), {
    params: Promise.resolve({ id }),
  })

describe('company actions', () => {
  it('validate input and create a company with its numbering', async () => {
    const user = await createTestUser()
    await signInAs(user.id)
    const invalid = await createCompanyAction({
      ...form,
      email: 'nope',
      invoicePrefix: 'bad prefix!',
      nextInvoiceNumber: '0',
    })
    expect(invalid).toMatchObject({ ok: false, error: 'invalid' })
    if (!invalid.ok)
      expect(Object.keys(invalid.fieldErrors ?? {}).sort()).toEqual([
        'email',
        'invoicePrefix',
        'nextInvoiceNumber',
      ])

    const created = await createCompanyAction(form)
    if (!created.ok) throw new Error('create failed')
    expect(await getCompany(user.id, created.data.id)).toMatchObject({
      invoicePrefix: 'SR-',
      nextInvoiceNumber: 100,
      defaultCurrency: 'IDR',
    })
  })

  it('accept real images only, within the size limit, and serve them to the owner only', async () => {
    const owner = await createTestUser()
    await signInAs(owner.id)
    const created = await createCompanyAction(form)
    if (!created.ok) throw new Error('create failed')
    const id = created.data.id

    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>',
    )
    expect(await uploadCompanyLogoAction(id, upload(svg, 'logo.png', 'image/png'))).toEqual({
      ok: false,
      error: 'invalid_file',
    })
    const huge = new Uint8Array(512 * 1024 + 1)
    huge.set(PNG)
    expect(await uploadCompanyLogoAction(id, upload(huge))).toEqual({
      ok: false,
      error: 'too_large',
    })
    expect(await uploadCompanyLogoAction(id, new FormData())).toEqual({
      ok: false,
      error: 'invalid_file',
    })

    // The browser's claimed type is ignored; the bytes decide.
    expect(await uploadCompanyLogoAction(id, upload(PNG, 'logo.gif', 'image/gif'))).toEqual({
      ok: true,
      data: undefined,
    })
    expect((await getCompanyLogo(owner.id, id))?.mime).toBe('image/png')

    const response = await logoRequest(id)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG)

    const intruder = await createTestUser()
    await signInAs(intruder.id)
    expect((await logoRequest(id)).status).toBe(404)
    expect(await uploadCompanyLogoAction(id, upload(PNG))).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await removeCompanyLogoAction(id)).toEqual({ ok: false, error: 'not_found' })

    resetRequest()
    expect((await logoRequest(id)).status).toBe(401)
  })
})
