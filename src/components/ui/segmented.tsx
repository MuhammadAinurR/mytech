'use client'

import Link from 'next/link'
import { ToggleGroup } from 'radix-ui'
import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const groupClasses = 'inline-flex items-center gap-0.5 rounded-sm bg-fill p-0.5'
const itemClasses = cn(
  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-xs px-2.5 text-sm font-medium text-muted',
  'transition-colors duration-150 ease-out hover:text-fg [&_svg]:size-4',
  'data-[state=on]:bg-surface-raised data-[state=on]:text-fg data-[state=on]:shadow-popover',
  'aria-[current=page]:bg-surface-raised aria-[current=page]:text-fg aria-[current=page]:shadow-popover',
)

type Option<T extends string> = { value: T; label: ReactNode }

/** Single-choice toggle for filters and modes that live in client state. */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
  itemClassName,
}: {
  value: T
  onValueChange: (value: T) => void
  options: Option<T>[]
  label: string
  className?: string
  itemClassName?: string
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next as T)}
      aria-label={label}
      className={cn(groupClasses, className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(itemClasses, itemClassName)}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}

/** Same look, for switching between routes (e.g. board and calendar views). */
export function SegmentedLinks({
  items,
  current,
  label,
  className,
}: {
  items: { href: string; label: ReactNode; value: string }[]
  current: string
  label: string
  className?: string
}) {
  return (
    <nav aria-label={label} className={cn(groupClasses, className)}>
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          aria-current={item.value === current ? 'page' : undefined}
          className={itemClasses}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
