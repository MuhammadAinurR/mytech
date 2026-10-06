import Link from 'next/link'

import { cn } from '@/lib/utils'

/** Section tabs: plain links with an underline on the current one. */
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
      className={cn('flex gap-6 overflow-x-auto border-b border-border px-(--gutter)', className)}
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
              active ? 'border-fg text-fg' : 'border-transparent text-muted hover:text-fg',
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
