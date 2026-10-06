import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { env } from '@/env'

import * as schema from './schema'

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { workbenchPool?: Pool }

const pool =
  globalForDb.workbenchPool ??
  new Pool({ connectionString: env.DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 })

if (env.NODE_ENV !== 'production') globalForDb.workbenchPool = pool

export const db = drizzle(pool, { schema, casing: 'snake_case' })

export type Db = typeof db
/** A transaction handle; accepted wherever a query must join an outer transaction. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx

export async function closeDb(): Promise<void> {
  await pool.end()
  globalForDb.workbenchPool = undefined
}

export { schema }
