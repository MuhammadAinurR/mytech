import 'server-only'

import { env } from '@/env'

/**
 * Whether a state-changing request came from this app's own pages. Server
 * actions check this themselves; route handlers that change data call this
 * first. Browsers send Origin on every POST, so a missing one fails too.
 */
export function isSameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(env.APP_URL).origin
}
