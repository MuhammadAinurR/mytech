'use client'

import { Check } from 'lucide-react'
import { DropdownMenu as Menu } from 'radix-ui'
import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger
export const DropdownMenuGroup = Menu.Group
export const DropdownMenuRadioGroup = Menu.RadioGroup

export const floatingClasses = cn(
  'z-50 rounded-md bg-surface-raised text-fg shadow-popover outline-none',
  'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
  // Mobile: thick glass, the radius following its 4px padding (14 − 4 = 10).
  'max-md:glass max-md:relative max-md:rounded-lg max-md:glass-thick',
)

export const itemClasses = cn(
  'relative flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm outline-none select-none',
  // Touch-sized rows on mobile.
  'max-md:h-11 max-md:rounded-md max-md:px-3 max-md:text-md',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-fill',
  '[&_svg]:size-4 [&_svg]:text-muted',
)

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = 'end',
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(floatingClasses, 'min-w-48 p-1', className)}
        {...props}
      />
    </Menu.Portal>
  )
}

export function DropdownMenuItem({
  className,
  tone = 'default',
  ...props
}: ComponentProps<typeof Menu.Item> & { tone?: 'default' | 'danger' }) {
  return (
    <Menu.Item
      className={cn(
        itemClasses,
        tone === 'danger' && 'text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn(itemClasses, 'pr-8', className)} {...props}>
      {children}
      <Menu.ItemIndicator className="absolute right-2 inline-flex">
        <Check className="text-fg!" />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn('px-2 pt-1.5 pb-1 text-xs text-subtle', className)} {...props} />
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('ml-auto pl-4 text-xs text-subtle', className)} {...props} />
}
