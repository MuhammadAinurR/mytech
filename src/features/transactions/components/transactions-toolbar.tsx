import { Search, X } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

import { type TransactionType } from '../schema'

type Filters = { month: string; type?: TransactionType; q?: string }

const typeOptions = [
  { value: undefined, label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
] as const

/** Type filter and search. Plain links and a GET form: works without JavaScript. */
export function TransactionsToolbar({
  filters,
  hrefFor,
}: {
  filters: Filters
  hrefFor: (patch: Partial<Filters>) => string
}) {
  return (
    <div className="flex flex-col gap-3 px-(--gutter) pb-3 sm:flex-row sm:items-center sm:justify-between">
      <nav
        aria-label="Filter by type"
        className="inline-flex items-center gap-0.5 self-start rounded-sm bg-fill p-0.5"
      >
        {typeOptions.map((option) => {
          const active = filters.type === option.value
          return (
            <Link
              key={option.label}
              href={hrefFor({ type: option.value, q: filters.q })}
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
      <form role="search" action="/transactions" method="get" className="relative sm:w-64">
        <input type="hidden" name="month" value={filters.month} />
        {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle"
        />
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Search category or note"
          aria-label="Search transactions"
          className="h-8 w-full rounded-sm border border-border-strong bg-surface pr-8 pl-8 text-sm text-fg placeholder:text-subtle hover:border-subtle focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-soft [&::-webkit-search-cancel-button]:hidden"
        />
        {filters.q ? (
          <Link
            href={hrefFor({ type: filters.type, q: undefined })}
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
