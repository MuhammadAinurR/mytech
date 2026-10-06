import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

import { buttonVariants } from './button'

/** "1–25 of 132" with previous/next links. Pages are 1-based. */
export function Pagination({
  page,
  pageSize,
  total,
  hrefForPage,
  className,
}: {
  page: number
  pageSize: number
  total: number
  hrefForPage: (page: number) => string
  className?: string
}) {
  if (total <= pageSize && page === 1) return null
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  const navButton = cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))
  const disabled = 'pointer-events-none opacity-40'

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-4 px-(--gutter) py-3', className)}
    >
      <p className="tabular text-sm text-muted">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={hrefForPage(page - 1)}
          aria-label="Previous page"
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(navButton, page <= 1 && disabled)}
        >
          <ChevronLeft />
        </Link>
        <Link
          href={hrefForPage(page + 1)}
          aria-label="Next page"
          aria-disabled={page >= lastPage}
          tabIndex={page >= lastPage ? -1 : undefined}
          className={cn(navButton, page >= lastPage && disabled)}
        >
          <ChevronRight />
        </Link>
      </div>
    </nav>
  )
}
