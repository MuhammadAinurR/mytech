'use client'

import { type ReactNode, useSyncExternalStore } from 'react'

import { isStandalone } from '@/features/notifications/lib/browser'

const noopSubscribe = () => () => {}

/** Renders children only when the app is (or isn't) running installed. */
export function InstalledOnly({
  installed,
  children,
}: {
  installed: boolean
  children: ReactNode
}) {
  const standalone = useSyncExternalStore(noopSubscribe, isStandalone, () => false)
  return standalone === installed ? children : null
}
