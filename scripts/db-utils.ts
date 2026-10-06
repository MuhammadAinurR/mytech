import pg from 'pg'

/**
 * Only databases named workbench_* may be created, dropped, or reset by our
 * scripts. Other databases on the same server belong to other projects.
 */
export const SAFE_DATABASE = /^workbench_[a-z0-9_]+$/

export function databaseName(url: string): string {
  const name = new URL(url).pathname.replace(/^\//, '')
  if (!SAFE_DATABASE.test(name)) {
    throw new Error(`Refusing to touch database "${name}": only workbench_* databases are allowed.`)
  }
  return name
}

function maintenanceUrl(url: string): string {
  const maintenance = new URL(url)
  maintenance.pathname = '/postgres'
  return maintenance.toString()
}

async function withMaintenanceClient<T>(url: string, fn: (client: pg.Client) => Promise<T>) {
  const client = new pg.Client({ connectionString: maintenanceUrl(url) })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

export async function ensureDatabase(url: string): Promise<boolean> {
  const name = databaseName(url)
  return withMaintenanceClient(url, async (client) => {
    const existing = await client.query('select 1 from pg_database where datname = $1', [name])
    if (existing.rowCount) return false
    // Identifiers cannot be parameterized; the name is validated above.
    await client.query(`create database "${name}"`)
    return true
  })
}

export async function recreateDatabase(url: string): Promise<void> {
  const name = databaseName(url)
  await withMaintenanceClient(url, async (client) => {
    await client.query(`drop database if exists "${name}" with (force)`)
    await client.query(`create database "${name}"`)
  })
}
