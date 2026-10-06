import { eq, sql } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { closeDb, db } from '.'
import { users } from './schema'

afterAll(closeDb)

const base = { name: 'Rofiq', passwordHash: 'x' }

function uniqueEmail() {
  return `user-${crypto.randomUUID()}@example.test`
}

describe('users table', () => {
  it('generates ids, timestamps, and defaults', async () => {
    const [user] = await db
      .insert(users)
      .values({ ...base, email: uniqueEmail() })
      .returning()
    expect(user?.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(user?.timezone).toBe('UTC')
    expect(user?.defaultCurrency).toBe('USD')
    expect(user?.createdAt).toBeInstanceOf(Date)
  })

  it('rejects duplicate emails', async () => {
    const email = uniqueEmail()
    await db.insert(users).values({ ...base, email })
    await expect(db.insert(users).values({ ...base, email })).rejects.toThrow()
  })

  it('only stores normalized emails', async () => {
    await expect(
      db.insert(users).values({ ...base, email: ' Mixed@Example.test' }),
    ).rejects.toThrow()
  })

  it('rejects blank names and malformed currencies', async () => {
    await expect(
      db.insert(users).values({ ...base, name: '  ', email: uniqueEmail() }),
    ).rejects.toThrow()
    await expect(
      db.insert(users).values({ ...base, email: uniqueEmail(), defaultCurrency: 'usd' }),
    ).rejects.toThrow()
  })

  it('bumps updated_at on update', async () => {
    const [created] = await db
      .insert(users)
      .values({ ...base, email: uniqueEmail() })
      .returning()
    await db.execute(sql`select pg_sleep(0.01)`)
    const [updated] = await db
      .update(users)
      .set({ name: 'Renamed' })
      .where(eq(users.id, created!.id))
      .returning()
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(created!.updatedAt.getTime())
  })
})
