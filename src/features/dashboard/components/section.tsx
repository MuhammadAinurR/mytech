import Link from 'next/link'
import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** A dashboard section: quiet heading, optional "View all", hairline above. */
export function DashboardSection({
  title,
  href,
  linkLabel = 'View all',
  children,
  className,
  first = false,
}: {
  /** First in its column on wide screens: no rule, so headings line up across columns. */
  first?: boolean
  title: string
  href?: string
  linkLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex flex-col gap-3',
        'border-t border-border pt-5',
        first && 'lg:border-t-0 lg:pt-0',
        className,
      )}
    >
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm text-muted hover:text-fg">
            {linkLabel}
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  )
}

export function QuietEmpty({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-subtle">{children}</p>
}
