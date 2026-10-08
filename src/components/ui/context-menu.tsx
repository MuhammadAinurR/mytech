'use client'

import { ContextMenu as Menu } from 'radix-ui'
import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

import { floatingClasses, itemClasses } from './dropdown-menu'

/**
 * Long-press (touch) or right-click menus for list rows: the mobile lists'
 * Edit / Duplicate / Delete, as iOS context menus. Same look as dropdowns.
 */
export const ContextMenu = Menu.Root
export const ContextMenuTrigger = Menu.Trigger

export function ContextMenuContent({ className, ...props }: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        collisionPadding={12}
        className={cn(floatingClasses, 'min-w-52 p-1', className)}
        {...props}
      />
    </Menu.Portal>
  )
}

export function ContextMenuItem({
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

export function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}
