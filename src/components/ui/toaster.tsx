'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Toaster as Sonner } from 'sonner'

export { toast } from 'sonner'

const MOBILE = '(width < 48rem)'

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * Toasts: bottom right on desktop; on mobile, glass capsules at the top, below
 * the status bar, where the tab bar can't cover them (as iOS notifications).
 */
export function Toaster() {
  const { resolvedTheme } = useTheme()
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE).matches,
    () => false,
  )
  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position={mobile ? 'top-center' : 'bottom-right'}
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 0.5rem)', left: '1rem', right: '1rem' }}
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-md bg-surface-raised px-4 py-3 text-sm text-fg shadow-popover sm:w-(--width) max-md:glass max-md:glass-thick max-md:rounded-xl max-md:py-3.5',
          title: 'font-medium',
          description: 'text-muted',
          actionButton:
            'ml-auto inline-flex h-7 cursor-pointer items-center rounded-sm bg-fill px-2.5 text-sm font-medium text-fg hover:bg-fill-strong',
          icon: '[&_svg]:size-4',
          error: '[&_[data-icon]]:text-danger',
          success: '[&_[data-icon]]:text-success',
        },
      }}
    />
  )
}
