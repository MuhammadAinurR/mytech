import { Skeleton } from '@/components/ui/skeleton'

/** First-visit placeholder matching the transactions page layout. */
export function TransactionsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading transactions">
      <div className="flex items-end justify-between gap-6 px-(--gutter) pt-8 pb-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="px-(--gutter) pb-3">
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="px-(--gutter) pb-8">
        <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2 py-4 pr-4 [&:not(:first-child)]:pl-6">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between px-(--gutter) pb-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="hidden h-8 w-64 sm:block" />
      </div>
      <div className="border-t border-border">
        {Array.from({ length: 8 }, (_, row) => (
          <div
            key={row}
            className="flex h-11 items-center gap-6 border-b border-border px-(--gutter)"
          >
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
