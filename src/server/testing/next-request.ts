/**
 * In-memory stand-ins for Next.js request APIs (cookies, headers, redirect,
 * revalidation) so server actions can run under Vitest. Registered globally in
 * vitest.setup.ts; tests manipulate `request` directly or via signInAs().
 */

export class RedirectError extends Error {
  constructor(public location: string) {
    super(`NEXT_REDIRECT:${location}`)
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND')
  }
}

type StoredCookie = { value: string; options?: Record<string, unknown> }

export const request = {
  cookies: new Map<string, StoredCookie>(),
  headers: new Headers({ 'x-forwarded-for': '10.0.0.1', 'user-agent': 'vitest' }),
}

export function resetRequest(ip = '10.0.0.1') {
  request.cookies.clear()
  request.headers = new Headers({ 'x-forwarded-for': ip, 'user-agent': 'vitest' })
}

export const cookieStore = {
  get: (name: string) =>
    request.cookies.has(name) ? { name, value: request.cookies.get(name)!.value } : undefined,
  set: (name: string, value: string, options?: Record<string, unknown>) =>
    void request.cookies.set(name, { value, options }),
  delete: (name: string) => void request.cookies.delete(name),
}
