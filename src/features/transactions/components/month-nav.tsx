import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { formatMonth, shiftMonth } from '@/lib/months'
import { cn } from '@/lib/utils'

/** "October 2026 ‹ ›" with an optional jump back to the current month. */
export function MonthNav({
  month,
  current,
  hrefFor,
}: {
  month: string
  current: string
  hrefFor: (month: string) => string
}) {
  const icon = cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))
  return (
    <div className="flex items-center gap-3">
      <h2 className="tabular text-md font-semibold">{formatMonth(month)}</h2>
      <div className="flex items-center gap-0.5">
        <Link href={hrefFor(shiftMonth(month, -1))} className={icon} aria-label="Previous month">
          <ChevronLeft />
        </Link>
        <Link href={hrefFor(shiftMonth(month, 1))} className={icon} aria-label="Next month">
          <ChevronRight />
        </Link>
      </div>
      {month !== current ? (
        <Link
          href={hrefFor(current)}
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
        >
          This month
        </Link>
      ) : null}
    </div>
  )
}
