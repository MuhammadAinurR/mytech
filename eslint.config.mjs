import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
  {
    // The data-access layer is the only way into the database. Pages, actions,
    // and components call src/server/queries/* instead of the client directly.
    files: ['src/**/*.{ts,tsx}'],
    // Tests may open and close connections for setup and teardown.
    ignores: ['src/server/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/server/db', '@/server/db/*', 'pg', 'drizzle-orm/node-postgres'],
              message: 'Only src/server/** may touch the database. Use src/server/queries/*.',
            },
          ],
        },
      ],
    },
  },
  {
    // CLI scripts print progress to the terminal on purpose.
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'artifacts/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
