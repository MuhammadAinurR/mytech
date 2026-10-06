import { loadEnvConfig } from '@next/env'

import { databaseName, recreateDatabase } from './scripts/db-utils'
import { runMigrations } from './scripts/migrate'

/**
 * Every test run starts from a freshly created workbench_test database with
 * all migrations applied, which also proves migrations apply cleanly.
 */
export default async function setup() {
  loadEnvConfig(process.cwd())
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set for tests')
  if (databaseName(url) !== 'workbench_test') {
    throw new Error('Tests must run against workbench_test')
  }
  await recreateDatabase(url)
  await runMigrations(url)
}
