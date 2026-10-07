'use client'

import { Check, Share, SquarePlus } from 'lucide-react'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import { isAppleMobile, isStandalone } from '@/features/notifications/lib/browser'

import { useInstallPrompt } from './install'

const noopSubscribe = () => () => {}

/** Installed, an Install button (Chrome, Edge, Android), or Safari's steps. */
export function InstallSettings() {
  const { canInstall, justInstalled, install } = useInstallPrompt()
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => false)
  const apple = useSyncExternalStore(noopSubscribe, isAppleMobile, () => false)

  if (standalone || justInstalled) {
    return (
      <p className="inline-flex items-center gap-2 text-sm">
        <Check aria-hidden className="size-4 text-success" />
        Installed on this device.
      </p>
    )
  }
  if (canInstall) {
    return <Button onClick={() => void install()}>Install Workbench</Button>
  }
  if (apple) {
    return (
      <ol className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <Share aria-hidden className="size-4 text-muted" />
          In Safari, tap Share.
        </li>
        <li className="flex items-center gap-2">
          <SquarePlus aria-hidden className="size-4 text-muted" />
          Choose Add to Home Screen, then open Workbench from there.
        </li>
      </ol>
    )
  }
  return (
    <p className="text-sm text-muted">
      Use your browser’s Install option, in the address bar or its menu.
    </p>
  )
}
