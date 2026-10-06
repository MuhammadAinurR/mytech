import { loadEnvConfig } from '@next/env'

// Load .env.local / .env before any module reads the environment.
loadEnvConfig(process.cwd())

async function main() {
  await import('@/env')
  const { runWorkerProcess } = await import('./worker')
  await runWorkerProcess()
}

main().catch((error: unknown) => {
  console.error('Worker failed to start:', error instanceof Error ? error.message : error)
  process.exit(1)
})
