import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * Section tabs: plain links with an underline on the current one; on mobile
 * a full-width segmented control (DESIGN.md → Mobile).
 */
export function TabsNav({
  items,
  current,
  label,
  className,
}: {
  items: { href: string; label: string; value: string }[]
  current: string
  label: string
  className?: string
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'flex gap-6 overflow-x-auto border-b border-border px-(--gutter)',
        'max-md:mx-4 max-md:grid max-md:auto-cols-fr max-md:grid-flow-col max-md:gap-0.5 max-md:rounded-sm max-md:border-b-0 max-md:bg-fill max-md:p-0.5',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === current
        return (
          <Link
            key={item.value}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative -mb-px shrink-0 border-b-2 py-2.5 text-sm font-medium transition-colors duration-150',
              'max-md:mb-0 max-md:rounded-xs max-md:border-b-0 max-md:py-1.5 max-md:text-center',
              active
                ? 'border-fg text-fg max-md:bg-surface-raised max-md:shadow-popover'
                : 'border-transparent text-muted hover:text-fg',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
