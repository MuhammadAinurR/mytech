import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { ensureDatabase } from '../scripts/db-utils'
import { runMigrations } from '../scripts/migrate'

/** Make sure the e2e database exists and is fully migrated. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? parseEnv(readFileSync('.env.test', 'utf8')).DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set for e2e')
  await ensureDatabase(url)
  await runMigrations(url)
}
