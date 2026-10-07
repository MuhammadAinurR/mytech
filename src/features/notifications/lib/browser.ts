/**
 * Browser-side push helpers for client components. Nothing here runs on the
 * server; every function checks for the APIs it needs.
 */
import { disablePushAction } from '../actions'

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone or iPad, including iPadOS reporting itself as a Mac. */
export function isAppleMobile(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  )
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (existing) return existing
  const url = process.env.NODE_ENV === 'development' ? '/sw.js?mode=dev' : '/sw.js'
  await navigator.serviceWorker.register(url, { scope: '/', updateViaCache: 'none' })
  return navigator.serviceWorker.ready
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration().catch(() => null)
  return (await reg?.pushManager.getSubscription()) ?? null
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function sameKey(key: ArrayBuffer | null | undefined, expected: Uint8Array): boolean {
  if (!key) return false
  const actual = new Uint8Array(key)
  return actual.length === expected.length && actual.every((byte, i) => byte === expected[i])
}

/**
 * Subscribes this browser with the server's public key, replacing a
 * subscription made with an older key. Call after permission is granted.
 */
export async function subscribe(publicKey: string): Promise<PushSubscription> {
  const reg = await registration()
  if (!reg) throw new Error('Service workers are unavailable')
  const applicationServerKey = keyBytes(publicKey)
  let subscription = await reg.pushManager.getSubscription()
  if (subscription && !sameKey(subscription.options.applicationServerKey, applicationServerKey)) {
    await subscription.unsubscribe()
    subscription = null
  }
  return subscription ?? reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })
}

/**
 * Stops reminders on this browser: forgets it on the server, then
 * unsubscribes. Gives up after two seconds so signing out never hangs on it.
 */
export async function forgetThisDevice(): Promise<void> {
  const forget = async () => {
    const subscription = await currentSubscription().catch(() => null)
    if (!subscription) return
    await disablePushAction(subscription.endpoint).catch(() => undefined)
    await subscription.unsubscribe().catch(() => false)
  }
  await Promise.race([forget(), new Promise<void>((resolve) => setTimeout(resolve, 2_000))])
}
