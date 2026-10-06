import 'server-only'

import { and, asc, count, eq, ilike, ne, or, type SQL } from 'drizzle-orm'

import { type CredentialInput, type CredentialType } from '@/features/credentials/schema'

import { type Keyring } from '../crypto/keyring'
import { credentialAad, getKeyring, openSecret, sealSecret } from '../crypto/secrets'
import { db } from '../db'
import { auditEvents, credentials } from '../db/schema'

/**
 * Data access for credentials. List and detail queries never select the
 * sealed secret; only revealSecret() decrypts, and it is always audited by
 * the caller.
 */

export const CREDENTIALS_PAGE_SIZE = 25

const publicColumns = {
  id: credentials.id,
  label: credentials.label,
  type: credentials.type,
  host: credentials.host,
  username: credentials.username,
  notes: credentials.notes,
  lastRevealedAt: credentials.lastRevealedAt,
  updatedAt: credentials.updatedAt,
}

export type CredentialItem = {
  id: string
  label: string
  type: CredentialType
  host: string | null
  username: string | null
  notes: string | null
  lastRevealedAt: Date | null
  updatedAt: Date
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

export async function listCredentials(
  userId: string,
  options: { q?: string; type?: CredentialType; page?: number; pageSize?: number } = {},
): Promise<{ items: CredentialItem[]; total: number; page: number; pageSize: number }> {
  const pageSize = options.pageSize ?? CREDENTIALS_PAGE_SIZE
  const page = Math.max(1, options.page ?? 1)
  const conditions: (SQL | undefined)[] = [eq(credentials.userId, userId)]
  if (options.type) conditions.push(eq(credentials.type, options.type))
  if (options.q) {
    const pattern = `%${escapeLike(options.q)}%`
    conditions.push(or(ilike(credentials.label, pattern), ilike(credentials.host, pattern)))
  }
  const where = and(...conditions)

  const [items, [totals]] = await Promise.all([
    db
      .select(publicColumns)
      .from(credentials)
      .where(where)
      .orderBy(asc(credentials.label), asc(credentials.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(credentials).where(where),
  ])
  return { items, total: totals?.total ?? 0, page, pageSize }
}

export async function getCredential(userId: string, id: string): Promise<CredentialItem | null> {
  const [row] = await db
    .select(publicColumns)
    .from(credentials)
    .where(and(eq(credentials.userId, userId), eq(credentials.id, id)))
    .limit(1)
  return row ?? null
}

function sealedColumns(userId: string, id: string, secret: string) {
  const sealed = sealSecret(secret, credentialAad(userId, id))
  return {
    secretCiphertext: sealed.ciphertext,
    secretIv: sealed.iv,
    secretTag: sealed.tag,
    keyVersion: sealed.keyVersion,
  }
}

export async function createCredential(
  userId: string,
  input: CredentialInput & { secret: string },
): Promise<CredentialItem> {
  // The id is chosen up front because it is part of the AAD.
  const id = crypto.randomUUID()
  const { secret, ...fields } = input
  const [row] = await db
    .insert(credentials)
    .values({ ...fields, id, userId, ...sealedColumns(userId, id, secret) })
    .returning(publicColumns)
  return row!
}

/** Updates fields; re-seals the secret only when a new one is given. */
export async function updateCredential(
  userId: string,
  id: string,
  input: CredentialInput,
): Promise<CredentialItem | null> {
  const { secret, ...fields } = input
  const [row] = await db
    .update(credentials)
    .set({ ...fields, ...(secret === null ? {} : sealedColumns(userId, id, secret)) })
    .where(and(eq(credentials.userId, userId), eq(credentials.id, id)))
    .returning(publicColumns)
  return row ?? null
}

export async function deleteCredential(userId: string, id: string): Promise<boolean> {
  const deleted = await db
    .delete(credentials)
    .where(and(eq(credentials.userId, userId), eq(credentials.id, id)))
    .returning({ id: credentials.id })
  return deleted.length > 0
}

/**
 * Decrypts one secret for its owner and writes the audit event in the same
 * transaction, so a reveal can never happen without a record of it.
 */
export async function revealSecret(
  userId: string,
  id: string,
  audit: { action: 'credential.reveal' | 'credential.copy'; ip?: string; userAgent?: string },
): Promise<string | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        ciphertext: credentials.secretCiphertext,
        iv: credentials.secretIv,
        tag: credentials.secretTag,
        keyVersion: credentials.keyVersion,
      })
      .from(credentials)
      .where(and(eq(credentials.userId, userId), eq(credentials.id, id)))
      .limit(1)
    if (!row) return null

    const secret = openSecret(row, credentialAad(userId, id))
    await tx.update(credentials).set({ lastRevealedAt: new Date() }).where(eq(credentials.id, id))
    await tx.insert(auditEvents).values({
      userId,
      action: audit.action,
      entityType: 'credential',
      entityId: id,
      ip: audit.ip,
      userAgent: audit.userAgent?.slice(0, 256),
    })
    return secret
  })
}

/**
 * Re-seals every secret still using an old key version with the current key,
 * in batches. Each update is guarded on the old version, so concurrent runs
 * are safe. Returns how many secrets were rotated.
 */
export async function rotateCredentialKeys({
  batchSize = 100,
  keyring = getKeyring(),
  userId,
}: {
  batchSize?: number
  keyring?: Keyring
  /** Limit to one user's credentials (all users by default). */
  userId?: string
} = {}): Promise<number> {
  const { current } = keyring
  let rotated = 0
  for (;;) {
    const batch = await db
      .select({
        id: credentials.id,
        userId: credentials.userId,
        ciphertext: credentials.secretCiphertext,
        iv: credentials.secretIv,
        tag: credentials.secretTag,
        keyVersion: credentials.keyVersion,
      })
      .from(credentials)
      .where(
        and(
          ne(credentials.keyVersion, current),
          userId ? eq(credentials.userId, userId) : undefined,
        ),
      )
      .limit(batchSize)
    if (batch.length === 0) return rotated

    for (const row of batch) {
      const aad = credentialAad(row.userId, row.id)
      const sealed = sealSecret(openSecret(row, aad, keyring), aad, keyring)
      const updated = await db
        .update(credentials)
        .set({
          secretCiphertext: sealed.ciphertext,
          secretIv: sealed.iv,
          secretTag: sealed.tag,
          keyVersion: sealed.keyVersion,
        })
        .where(and(eq(credentials.id, row.id), eq(credentials.keyVersion, row.keyVersion)))
        .returning({ id: credentials.id })
      rotated += updated.length
    }
  }
}

export type AuditEntry = { action: string; createdAt: Date; ip: string | null }

export async function listCredentialAudit(
  userId: string,
  credentialId: string,
  limit = 10,
): Promise<AuditEntry[]> {
  const rows = await db
    .select({ action: auditEvents.action, createdAt: auditEvents.createdAt, ip: auditEvents.ip })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.userId, userId),
        eq(auditEvents.entityType, 'credential'),
        eq(auditEvents.entityId, credentialId),
      ),
    )
    .orderBy(asc(auditEvents.createdAt))
    .limit(limit)
  return rows.reverse()
}
