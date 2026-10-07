import { Slot } from 'radix-ui'
import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * A 44px Liquid Glass circle for the mobile floating layer: back, page
 * actions, search. `accent` is for the one prominent action on a screen.
 * Icon-only, so it always needs an aria-label.
 */
export function GlassButton({
  variant = 'default',
  asChild = false,
  className,
  ...props
}: ComponentProps<'button'> & {
  variant?: 'default' | 'accent'
  asChild?: boolean
  'aria-label': string
}) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      className={cn(
        'glass relative inline-flex size-11 shrink-0 glass-press cursor-pointer items-center justify-center rounded-full text-fg',
        'focus-visible:outline-offset-2 [&_svg]:size-5',
        variant === 'accent' && 'glass-accent',
        className,
      )}
      {...props}
    />
  )
}
