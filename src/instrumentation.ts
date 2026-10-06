/**
 * Called once when a Next.js server instance starts. Importing `env` validates
 * the configuration so a misconfigured deployment fails at boot, not on the
 * first request that happens to need a variable.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./env')
  }
}
