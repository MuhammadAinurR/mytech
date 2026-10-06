import { loadEnvConfig } from '@next/env'
import { vi } from 'vitest'

// Load .env.test (NODE_ENV is "test" under Vitest) before any module reads env.
loadEnvConfig(process.cwd())

// Next.js request APIs only exist inside a Next server; tests use fakes.
vi.mock('next/headers', async () => {
  const { cookieStore, request } = await import('@/server/testing/next-request')
  return { cookies: async () => cookieStore, headers: async () => request.headers }
})
vi.mock('next/navigation', async () => {
  const { NotFoundError, RedirectError } = await import('@/server/testing/next-request')
  return {
    redirect: (location: string) => {
      throw new RedirectError(location)
    },
    notFound: () => {
      throw new NotFoundError()
    },
  }
})
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}))
