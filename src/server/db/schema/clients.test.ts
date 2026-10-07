import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { clients, companies } from '.'

afterAll(closeDb)

async function setup() {
  const user = await createTestUser()
  const [first, second] = await db
    .insert(companies)
    .values([
      { userId: user.id, name: 'Studio Rofiq', defaultCurrency: 'USD' },
      { userId: user.id, name: 'Rofiq Labs', defaultCurrency: 'IDR' },
    ])
    .returning()
  return { user, company: first!, other: second! }
}

const client = (
  userId: string,
  companyId: string,
  overrides: Partial<typeof clients.$inferInsert> = {},
) => ({
  userId,
  companyId,
  name: 'Northwind Labs',
  ...overrides,
})

describe('clients table', () => {
  it('stores a client with only a name, leaving the rest empty', async () => {
    const { user, company } = await setup()
    const [row] = await db.insert(clients).values(client(user.id, company.id)).returning()
    expect(row).toMatchObject({ name: 'Northwind Labs', address: null, email: null, taxId: null })
  })

  it('keeps names unique per company, ignoring case, but allows them across companies', async () => {
    const { user, company, other } = await setup()
    await db.insert(clients).values(client(user.id, company.id))
    await expect(
      db.insert(clients).values(client(user.id, company.id, { name: 'NORTHWIND labs' })),
    ).rejects.toThrow()
    await expect(db.insert(clients).values(client(user.id, other.id))).resolves.toBeDefined()
  })

  it.each([
    ['a blank name', { name: '   ' }],
    ['a name over 160 characters', { name: 'x'.repeat(161) }],
    ['an address over 1000 characters', { address: 'x'.repeat(1001) }],
    ['an email over 254 characters', { email: `${'x'.repeat(250)}@a.io` }],
    ['a tax ID over 64 characters', { taxId: 'x'.repeat(65) }],
  ])('rejects %s', async (_label, override) => {
    const { user, company } = await setup()
    await expect(db.insert(clients).values(client(user.id, company.id, override))).rejects.toThrow()
  })

  it('goes with its company', async () => {
    const { user, company } = await setup()
    await db.insert(clients).values(client(user.id, company.id))
    await db.delete(companies).where(eq(companies.id, company.id))
    expect(await db.select().from(clients).where(eq(clients.companyId, company.id))).toEqual([])
  })
})
