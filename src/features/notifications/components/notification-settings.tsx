'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'
import { toast } from '@/components/ui/toaster'

import {
  enablePushAction,
  pushDeviceStatusAction,
  removePushDeviceAction,
  sendTestPushAction,
} from '../actions'
import {
  currentSubscription,
  forgetThisDevice,
  isAppleMobile,
  isStandalone,
  pushSupported,
  subscribe,
} from '../lib/browser'

export type DeviceRow = { id: string; label: string; detail: string }

type Status =
  | { kind: 'checking' }
  | { kind: 'needs-install' | 'unsupported' | 'blocked' | 'off' }
  | { kind: 'on'; deviceId: string }

async function detect(): Promise<Status> {
  if (!pushSupported()) {
    // iOS only exposes push to apps added to the Home Screen.
    return { kind: isAppleMobile() && !isStandalone() ? 'needs-install' : 'unsupported' }
  }
  if (Notification.permission === 'denied') return { kind: 'blocked' }
  const subscription = await currentSubscription()
  if (!subscription) return { kind: 'off' }
  const result = await pushDeviceStatusAction(subscription.endpoint)
  return result.ok && result.data.deviceId
    ? { kind: 'on', deviceId: result.data.deviceId }
    : { kind: 'off' }
}

/**
 * Invoice reminders on this device: turn on (asks permission), test, turn
 * off, and the other devices that receive them.
 */
export function NotificationSettings({
  publicKey,
  devices,
}: {
  /** Null when the server has no VAPID keys. */
  publicKey: string | null
  devices: DeviceRow[]
}) {
  const router = useRouter()
  const [status, setStatus] = useState<Status>({ kind: 'checking' })
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!publicKey) return
    let current = true
    detect()
      .then((next) => current && setStatus(next))
      .catch(() => current && setStatus({ kind: 'off' }))
    return () => {
      current = false
    }
  }, [publicKey])

  if (!publicKey) {
    return (
      <p className="text-sm text-muted">
        Notifications aren’t set up on this server yet. Add the VAPID keys to its environment to
        turn them on.
      </p>
    )
  }

  function turnOn() {
    startTransition(async () => {
      // Must be asked from the click itself, before anything else awaits.
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus({ kind: permission === 'denied' ? 'blocked' : 'off' })
        return
      }
      try {
        const subscription = await subscribe(publicKey!)
        const saved = await enablePushAction(subscription.toJSON())
        if (!saved.ok) throw new Error(saved.error)
        setStatus(await detect())
        toast.success('Reminders are on for this device')
        router.refresh()
      } catch {
        toast.error('This browser couldn’t turn on notifications. Try again in a moment.')
      }
    })
  }

  function turnOff() {
    startTransition(async () => {
      await forgetThisDevice()
      setStatus({ kind: 'off' })
      toast.success('Reminders are off for this device')
      router.refresh()
    })
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestPushAction()
      if (result.ok) {
        toast.success(
          result.data.sent === 1
            ? 'Test sent. It should arrive in a few seconds.'
            : `Test sent to ${result.data.sent} devices.`,
        )
      } else if (result.error === 'rate_limited') {
        toast.error('That’s enough tests for now. Try again in a few minutes.')
      } else if (result.error === 'no_devices') {
        toast.error('No device has reminders turned on.')
      } else {
        toast.error('The test couldn’t be delivered. Your devices may be offline.')
      }
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removePushDeviceAction(id)
      if (result.ok) toast.success('Device removed')
      else toast.error('That device was already removed.')
      router.refresh()
    })
  }

  const thisDevice = status.kind === 'on' ? status.deviceId : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3" aria-live="polite">
        <StatusLine status={status} />
        {status.kind === 'off' ? (
          <div>
            <Button onClick={turnOn} loading={pending}>
              Turn on for this device
            </Button>
          </div>
        ) : null}
        {status.kind === 'on' ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendTest} loading={pending}>
              Send a test
            </Button>
            <Button variant="ghost" onClick={turnOff} disabled={pending}>
              Turn off
            </Button>
          </div>
        ) : null}
      </div>

      {devices.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Devices</h3>
          <ul className="flex flex-col rounded-md border border-border">
            {devices.map((device) => (
              <li
                key={device.id}
                className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{device.label}</p>
                  <p className="truncate text-xs text-muted">
                    {device.id === thisDevice ? 'This device · ' : ''}
                    {device.detail}
                  </p>
                </div>
                {device.id === thisDevice ? null : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(device.id)}
                    disabled={pending}
                    aria-label={`Remove ${device.label}`}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

function StatusLine({ status }: { status: Status }) {
  switch (status.kind) {
    case 'checking':
      return <Skeleton className="h-5 w-48" />
    case 'on':
      return (
        <StatusDot tone="success" className="text-sm">
          On for this device
        </StatusDot>
      )
    case 'off':
      return <StatusDot className="text-sm text-muted">Off for this device</StatusDot>
    case 'blocked':
      return (
        <p className="text-sm text-muted">
          Notifications are blocked for Workbench. Allow them in this browser’s site settings, then
          come back here.
        </p>
      )
    case 'needs-install':
      return (
        <p className="text-sm text-muted">
          On iPhone and iPad, reminders work once Workbench is on your Home Screen. In Safari, tap
          Share, then Add to Home Screen, and turn them on from the app.
        </p>
      )
    case 'unsupported':
      return <p className="text-sm text-muted">This browser can’t receive notifications.</p>
  }
}
