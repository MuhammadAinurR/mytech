/**
 * Session cookie names. `__Host-` (Secure, no Domain, Path=/) is used whenever
 * the app is served over HTTPS. Shared with proxy.ts, which only checks presence.
 */
export const SECURE_SESSION_COOKIE = '__Host-wb_session'
export const DEV_SESSION_COOKIE = 'wb_session'
export const SESSION_COOKIE_NAMES = [SECURE_SESSION_COOKIE, DEV_SESSION_COOKIE] as const
