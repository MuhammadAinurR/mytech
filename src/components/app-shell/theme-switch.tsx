'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { SegmentedControl } from '@/components/ui/segmented'

const noopSubscribe = () => () => {}

/** Light, Dark, or System, as a segmented control (the mobile More page). */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  // The stored theme is only known in the browser; render System until then.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
  return (
    <SegmentedControl
      label="Theme"
      value={(mounted ? theme : 'system') as 'light' | 'dark' | 'system'}
      onValueChange={setTheme}
      options={[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' },
      ]}
    />
  )
}
