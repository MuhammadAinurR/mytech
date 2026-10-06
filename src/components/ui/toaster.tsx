'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

export { toast } from 'sonner'

export function Toaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-full items-center gap-3 rounded-md bg-surface-raised px-4 py-3 text-sm text-fg shadow-popover sm:w-(--width)',
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
