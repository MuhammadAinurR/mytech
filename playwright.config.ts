import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

import { defineConfig, devices } from '@playwright/test'

// E2E runs against the test database and Redis DB from .env.test. Variables
// already in the environment (CI) win. `next start` gets these explicitly, and
// Next.js never overrides variables that are already set, so .env.local is ignored.
const testEnv = { ...parseEnv(readFileSync('.env.test', 'utf8')), ...pickDefined(process.env) }

function pickDefined(source: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}

const PORT = 3100
// Point at an already running server (e.g. `npm run dev`) for quick visual checks.
const externalBaseUrl = process.env.PW_BASE_URL

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: externalBaseUrl ?? `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'e2e',
      testIgnore: /visual\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    },
    {
      // Screenshot review for ui/* branches. Run explicitly with --project=visual.
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `npm run build && npm run start -- --port ${PORT}`,
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
          DATABASE_URL: testEnv.DATABASE_URL ?? '',
          REDIS_URL: testEnv.REDIS_URL ?? '',
          ENCRYPTION_KEYS: testEnv.ENCRYPTION_KEYS ?? '',
          ENCRYPTION_KEY_VERSION: testEnv.ENCRYPTION_KEY_VERSION ?? '',
          APP_URL: `http://localhost:${PORT}`,
          LOG_LEVEL: 'warn',
        },
      },
})
