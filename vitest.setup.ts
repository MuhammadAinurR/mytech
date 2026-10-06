import { loadEnvConfig } from '@next/env'

// Load .env.test (NODE_ENV is "test" under Vitest) before any module reads env.
loadEnvConfig(process.cwd())
