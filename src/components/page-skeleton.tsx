import { Skeleton } from '@/components/ui/skeleton'

/** Generic list-page skeleton: header, toolbar, and table rows. */
export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      <div className="flex items-end justify-between gap-6 px-(--gutter) pt-8 pb-6 max-md:pt-(--title-top)">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="border-t border-border">
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="flex h-11 items-center gap-6 border-b border-border px-(--gutter)"
          >
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="hidden h-3.5 w-24 md:block" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
