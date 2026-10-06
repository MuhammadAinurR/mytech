'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { SegmentedControl } from '@/components/ui/segmented'

const subscribe = () => () => {}

/** Light / Dark / System. Renders after hydration to avoid a theme mismatch. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )

  return (
    <SegmentedControl
      label="Theme"
      className={className}
      value={mounted ? (theme ?? 'system') : 'system'}
      onValueChange={setTheme}
      options={[
        { value: 'light', label: <Sun aria-label="Light" /> },
        { value: 'dark', label: <Moon aria-label="Dark" /> },
        { value: 'system', label: <Monitor aria-label="System" /> },
      ]}
    />
  )
}
