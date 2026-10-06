import { loadEnvConfig } from '@next/env'

/**
 * Re-seals every credential secret with the current ENCRYPTION_KEY_VERSION.
 * Run after adding a new key and pointing ENCRYPTION_KEY_VERSION at it; once it
 * reports 0 remaining, the old key can be removed from ENCRYPTION_KEYS.
 */
async function main() {
  loadEnvConfig(process.cwd())
  const { rotateCredentialKeys } = await import('@/server/queries/credentials')
  const { closeDb } = await import('@/server/db')
  const rotated = await rotateCredentialKeys()
  console.log(`Re-sealed ${rotated} secret(s) with the current key.`)
  await closeDb()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
