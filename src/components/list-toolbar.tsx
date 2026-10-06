import { Search, X } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

type FilterOption = { value: string | undefined; label: string; href: string }

/**
 * Filter links on the left, a GET search form on the right. Plain links and a
 * form, so filtering works without JavaScript and every state is linkable.
 */
export function ListToolbar({
  filterLabel,
  filters,
  current,
  search,
}: {
  filterLabel: string
  filters: FilterOption[]
  current: string | undefined
  search: {
    action: string
    placeholder: string
    label: string
    value?: string
    /** Other params to keep when searching. */
    keep: Record<string, string | undefined>
    clearHref: string
  }
}) {
  return (
    <div className="flex flex-col gap-3 px-(--gutter) pb-3 sm:flex-row sm:items-center sm:justify-between">
      <nav
        aria-label={filterLabel}
        className="inline-flex items-center gap-0.5 self-start rounded-sm bg-fill p-0.5"
      >
        {filters.map((option) => {
          const active = current === option.value
          return (
            <Link
              key={option.label}
              href={option.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-7 items-center rounded-xs px-2.5 text-sm font-medium text-muted transition-colors hover:text-fg',
                active && 'bg-surface-raised text-fg shadow-popover',
              )}
            >
              {option.label}
            </Link>
          )
        })}
      </nav>
      <form role="search" action={search.action} method="get" className="relative sm:w-64">
        {Object.entries(search.keep).map(([name, value]) =>
          value ? <input key={name} type="hidden" name={name} value={value} /> : null,
        )}
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle"
        />
        <input
          type="search"
          name="q"
          defaultValue={search.value}
          placeholder={search.placeholder}
          aria-label={search.label}
          className="h-8 w-full rounded-sm border border-border-strong bg-surface pr-8 pl-8 text-sm text-fg placeholder:text-subtle hover:border-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-soft [&::-webkit-search-cancel-button]:hidden"
        />
        {search.value ? (
          <Link
            href={search.clearHref}
            aria-label="Clear search"
            className="absolute top-1/2 right-1 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-xs text-subtle hover:text-fg"
          >
            <X className="size-4" />
          </Link>
        ) : null}
      </form>
    </div>
  )
}
