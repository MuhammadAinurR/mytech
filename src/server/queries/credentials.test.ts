import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

import { type CredentialInput } from '@/features/credentials/schema'

import { parseKeyring } from '../crypto/keyring'
import { credentialAad, openSecret, SecretDecryptionError } from '../crypto/secrets'
import { closeDb, db } from '../db'
import { auditEvents, credentials } from '../db/schema'
import { createTestUser } from '../testing/factories'
import {
  createCredential,
  deleteCredential,
  getCredential,
  listCredentialAudit,
  listCredentials,
  revealSecret,
  rotateCredentialKeys,
  updateCredential,
} from './credentials'

afterAll(closeDb)

const input = (overrides: Partial<CredentialInput> = {}): CredentialInput & { secret: string } =>
  ({
    label: 'Production database',
    type: 'server',
    host: 'db.internal.example',
    username: 'app',
    notes: null,
    secret: 'p@ssw0rd-in-the-vault',
    ...overrides,
  }) as CredentialInput & { secret: string }

const audit = { action: 'credential.reveal' as const, ip: '10.0.0.5', userAgent: 'vitest' }

describe('credentials data access', () => {
  it('stores only ciphertext and never returns secrets from list or detail queries', async () => {
    const user = await createTestUser()
    const created = await createCredential(user.id, input())

    const [raw] = await db.select().from(credentials).where(eq(credentials.id, created.id))
    expect(JSON.stringify(raw)).not.toContain('p@ssw0rd')
    expect(raw?.keyVersion).toBe(1)

    const { items } = await listCredentials(user.id)
    const detail = await getCredential(user.id, created.id)
    for (const shape of [items[0], detail]) {
      expect(Object.keys(shape ?? {}).join(',')).not.toMatch(/secret|cipher|iv|tag|key/i)
      expect(JSON.stringify(shape)).not.toContain('p@ssw0rd')
    }
  })

  it('searches by label or host and filters by type', async () => {
    const user = await createTestUser()
    await createCredential(
      user.id,
      input({ label: 'Registrar', type: 'domain', host: 'registrar.example' }),
    )
    await createCredential(user.id, input({ label: 'VPS root', host: '203.0.113.7' }))
    await createCredential(user.id, input({ label: 'Wi-Fi', type: 'other', host: null }))

    expect((await listCredentials(user.id, { q: 'regis' })).items.map((c) => c.label)).toEqual([
      'Registrar',
    ])
    expect((await listCredentials(user.id, { q: '203.0' })).items.map((c) => c.label)).toEqual([
      'VPS root',
    ])
    expect((await listCredentials(user.id, { type: 'other' })).items.map((c) => c.label)).toEqual([
      'Wi-Fi',
    ])
    expect((await listCredentials(user.id, { q: '_' })).total).toBe(0)
  })

  it('reveals a secret only with an audit record and timestamp', async () => {
    const user = await createTestUser()
    const created = await createCredential(user.id, input())
    expect(await revealSecret(user.id, created.id, audit)).toBe('p@ssw0rd-in-the-vault')
    await revealSecret(user.id, created.id, { ...audit, action: 'credential.copy' })

    const events = await db.select().from(auditEvents).where(eq(auditEvents.entityId, created.id))
    expect(events.map((e) => e.action).sort()).toEqual(['credential.copy', 'credential.reveal'])
    expect(events[0]).toMatchObject({ userId: user.id, ip: '10.0.0.5', entityType: 'credential' })
    expect(JSON.stringify(events)).not.toContain('p@ssw0rd')
    expect((await getCredential(user.id, created.id))?.lastRevealedAt).toBeInstanceOf(Date)
    expect(await listCredentialAudit(user.id, created.id)).toHaveLength(2)
  })

  it('keeps the stored secret when an update leaves it blank and re-seals a new one', async () => {
    const user = await createTestUser()
    const created = await createCredential(user.id, input())
    const [before] = await db.select().from(credentials).where(eq(credentials.id, created.id))

    await updateCredential(user.id, created.id, { ...input({ label: 'Renamed' }), secret: null })
    const [kept] = await db.select().from(credentials).where(eq(credentials.id, created.id))
    expect(kept?.secretCiphertext).toBe(before?.secretCiphertext)
    expect(await revealSecret(user.id, created.id, audit)).toBe('p@ssw0rd-in-the-vault')

    await updateCredential(user.id, created.id, input({ secret: 'rotated-secret' }))
    const [resealed] = await db.select().from(credentials).where(eq(credentials.id, created.id))
    expect(resealed?.secretIv).not.toBe(before?.secretIv)
    expect(await revealSecret(user.id, created.id, audit)).toBe('rotated-secret')
  })

  it('re-seals old key versions with the current key', async () => {
    const user = await createTestUser()
    const created = await createCredential(user.id, input({ secret: 'rotate me' }))
    const envKey = process.env.ENCRYPTION_KEYS!
    const newKey = Buffer.alloc(32, 42).toString('base64')
    const ring = parseKeyring(`${envKey},2:${newKey}`, 2)

    expect(await rotateCredentialKeys({ keyring: ring, userId: user.id })).toBe(1)
    const [row] = await db.select().from(credentials).where(eq(credentials.id, created.id))
    expect(row?.keyVersion).toBe(2)
    const sealed = {
      ciphertext: row!.secretCiphertext,
      iv: row!.secretIv,
      tag: row!.secretTag,
      keyVersion: 2,
    }
    expect(openSecret(sealed, credentialAad(user.id, created.id), ring)).toBe('rotate me')
    expect(await rotateCredentialKeys({ keyring: ring, userId: user.id })).toBe(0)
  })
})

describe('credentials isolation', () => {
  it('never exposes or changes another user’s credentials', async () => {
    const owner = await createTestUser()
    const intruder = await createTestUser()
    const mine = await createCredential(owner.id, input())

    expect(await getCredential(intruder.id, mine.id)).toBeNull()
    expect((await listCredentials(intruder.id)).items).toEqual([])
    expect(await revealSecret(intruder.id, mine.id, audit)).toBeNull()
    expect(await updateCredential(intruder.id, mine.id, input({ secret: 'pwned' }))).toBeNull()
    expect(await deleteCredential(intruder.id, mine.id)).toBe(false)
    expect(await listCredentialAudit(intruder.id, mine.id)).toEqual([])
    expect(await revealSecret(owner.id, mine.id, audit)).toBe('p@ssw0rd-in-the-vault')
  })

  it('cannot open a ciphertext copied into another user’s row', async () => {
    const victim = await createTestUser()
    const attacker = await createTestUser()
    const target = await createCredential(victim.id, input({ secret: 'victim secret' }))
    const decoy = await createCredential(attacker.id, input({ secret: 'decoy' }))
    const [stolen] = await db.select().from(credentials).where(eq(credentials.id, target.id))

    await db
      .update(credentials)
      .set({
        secretCiphertext: stolen!.secretCiphertext,
        secretIv: stolen!.secretIv,
        secretTag: stolen!.secretTag,
      })
      .where(eq(credentials.id, decoy.id))
    await expect(revealSecret(attacker.id, decoy.id, audit)).rejects.toThrow(SecretDecryptionError)
  })
})
