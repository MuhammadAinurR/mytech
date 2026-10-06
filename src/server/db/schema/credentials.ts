import { sql } from 'drizzle-orm'
import { check, index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { id, timestamps } from './columns'
import { credentialType } from './enums'
import { users } from './users'

/**
 * Stored credentials. The secret is only ever stored encrypted
 * (AES-256-GCM): ciphertext, a unique 96-bit IV, and the auth tag, all base64,
 * plus the version of the key that sealed it so keys can be rotated.
 */
export const credentials = pgTable(
  'credentials',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text().notNull(),
    type: credentialType().notNull(),
    host: text(),
    username: text(),
    secretCiphertext: text().notNull(),
    secretIv: text().notNull(),
    secretTag: text().notNull(),
    keyVersion: smallint().notNull(),
    notes: text(),
    lastRevealedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('credentials_user_label_idx').on(table.userId, table.label),
    index('credentials_user_type_idx').on(table.userId, table.type),
    index('credentials_key_version_idx').on(table.keyVersion),
    check('credentials_label_length', sql`length(btrim(${table.label})) between 1 and 120`),
    check('credentials_host_length', sql`${table.host} is null or length(${table.host}) <= 255`),
    check(
      'credentials_username_length',
      sql`${table.username} is null or length(${table.username}) <= 255`,
    ),
    check(
      'credentials_notes_length',
      sql`${table.notes} is null or length(${table.notes}) <= 2000`,
    ),
    check('credentials_key_version_positive', sql`${table.keyVersion} > 0`),
    // 12-byte IV and 16-byte tag, base64 encoded.
    check('credentials_iv_size', sql`length(${table.secretIv}) = 16`),
    check('credentials_tag_size', sql`length(${table.secretTag}) = 24`),
  ],
)

/** Append-only record of sensitive actions, such as revealing a secret. */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: uuid(),
    ip: text(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_events_user_created_idx').on(table.userId, table.createdAt.desc()),
    index('audit_events_entity_idx').on(table.entityType, table.entityId),
  ],
)

export type CredentialRow = typeof credentials.$inferSelect
export type AuditEventRow = typeof auditEvents.$inferSelect
