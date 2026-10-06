import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { createTestUser } from '../../testing/factories'
import { closeDb, db } from '..'
import { auditEvents, credentials, users } from '.'

afterAll(closeDb)

const sealed = {
  label: 'Production database',
  type: 'server' as const,
  secretCiphertext: 'c2VjcmV0',
  secretIv: 'AAAAAAAAAAAAAAAA', // 12 bytes, base64
  secretTag: 'AAAAAAAAAAAAAAAAAAAAAA==', // 16 bytes, base64
  keyVersion: 1,
}

describe('credentials table', () => {
  it('stores a sealed secret', async () => {
    const user = await createTestUser()
    const [row] = await db
      .insert(credentials)
      .values({ ...sealed, userId: user.id })
      .returning()
    expect(row).toMatchObject({ keyVersion: 1, lastRevealedAt: null })
  })

  it.each([
    ['a malformed IV', { secretIv: 'short' }],
    ['a malformed tag', { secretTag: 'short' }],
    ['key version 0', { keyVersion: 0 }],
    ['a blank label', { label: ' ' }],
  ])('rejects %s', async (_label, override) => {
    const user = await createTestUser()
    await expect(
      db.insert(credentials).values({ ...sealed, ...override, userId: user.id }),
    ).rejects.toThrow()
  })

  it('removes credentials and audit history with the user', async () => {
    const user = await createTestUser()
    const [row] = await db
      .insert(credentials)
      .values({ ...sealed, userId: user.id })
      .returning()
    await db.insert(auditEvents).values({
      userId: user.id,
      action: 'credential.reveal',
      entityType: 'credential',
      entityId: row!.id,
    })
    await db.delete(users).where(eq(users.id, user.id))
    expect(await db.select().from(credentials).where(eq(credentials.userId, user.id))).toEqual([])
    expect(await db.select().from(auditEvents).where(eq(auditEvents.userId, user.id))).toEqual([])
  })
})
