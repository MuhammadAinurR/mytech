'use client'

import { Popover as PopoverPrimitive, Tooltip as TooltipPrimitive } from 'radix-ui'
import { type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { floatingClasses } from './dropdown-menu'

export const TooltipProvider = TooltipPrimitive.Provider

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode
  children: ReactNode
  side?: ComponentProps<typeof TooltipPrimitive.Content>['side']
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-50 rounded-sm bg-fg px-2 py-1 text-xs text-surface',
            'data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-fade-in',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close

export function PopoverContent({
  className,
  sideOffset = 6,
  align = 'start',
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(floatingClasses, 'w-72 p-4', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}
