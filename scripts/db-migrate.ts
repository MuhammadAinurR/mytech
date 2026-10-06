import { loadEnvConfig } from '@next/env'

import { databaseName, ensureDatabase } from './db-utils'
import { runMigrations } from './migrate'

async function main() {
  loadEnvConfig(process.cwd())
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  const name = databaseName(url)
  if (await ensureDatabase(url)) console.log(`Created database ${name}`)
  await runMigrations(url)
  console.log(`Migrations applied to ${name}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
