/**
 * Builds the Content-Security-Policy for a page response.
 *
 * Scripts are locked down with a per-request nonce and `'strict-dynamic'`, so
 * only scripts Next.js (or our own code) emits with the nonce can run. Styles
 * allow `'unsafe-inline'` because UI primitives set inline style attributes for
 * positioning; style injection cannot execute code. See ADR 0001.
 */
export function buildContentSecurityPolicy({
  nonce,
  isDev,
}: {
  nonce: string
  isDev: boolean
}): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'blob:', 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'", ...(isDev ? ['ws:'] : [])],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
  }

  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`)
  if (!isDev) policy.push('upgrade-insecure-requests')
  return policy.join('; ')
}

export function createNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}
