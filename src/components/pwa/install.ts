'use client'

import { useSyncExternalStore } from 'react'

/** Chrome's install prompt event (not in the DOM typings). */
type InstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/**
 * Holds on to the browser's install prompt so Settings (and the mobile More
 * page) can offer "Install Workbench" when the user wants it. Called once at
 * startup; Safari never fires these events.
 */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as InstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    notify()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  )
  const justInstalled = useSyncExternalStore(
    subscribe,
    () => installed,
    () => false,
  )
  return {
    canInstall,
    justInstalled,
    async install() {
      if (!deferred) return
      const event = deferred
      deferred = null
      notify()
      await event.prompt()
      await event.userChoice
    },
  }
}
