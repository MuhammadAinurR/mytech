import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/**
 * Table primitives. Tables run edge to edge inside the content panel; the
 * first and last cells pad by `--gutter` so cell text lines up with the page
 * header while row hover still spans the full width.
 */

export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="relative w-full max-md:overflow-x-auto">
      <table
        className={cn('w-full border-separate border-spacing-0 text-sm', className)}
        {...props}
      />
    </div>
  )
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  // Sticky only from md up: below that the table scrolls horizontally inside its
  // own wrapper, where a sticky offset would push the header over the first row.
  return (
    <thead className={cn('md:[&_th]:sticky md:[&_th]:top-(--sticky-top)', className)} {...props} />
  )
}

export function TableBody(props: ComponentProps<'tbody'>) {
  return <tbody {...props} />
}

const edgeCells = 'first:pl-(--gutter) last:pr-(--gutter)'

export function TableHead({
  className,
  numeric = false,
  ...props
}: ComponentProps<'th'> & { numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        'z-10 h-9 border-b border-border bg-surface px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted',
        edgeCells,
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  )
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'group/row transition-colors duration-150 ease-out hover:bg-fill/60',
        'focus-visible:bg-fill/60 focus-visible:outline-2 focus-visible:-outline-offset-2',
        'data-[state=selected]:bg-fill',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({
  className,
  numeric = false,
  ...props
}: ComponentProps<'td'> & { numeric?: boolean }) {
  return (
    <td
      className={cn(
        'h-11 border-b border-border px-3 align-middle',
        edgeCells,
        numeric && 'text-right tabular whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}

/** Quiet row actions: hidden until the row is hovered or focused (always on touch). */
export function RowActions({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-1 opacity-0 transition-opacity duration-150',
        'group-focus-within/row:opacity-100 group-hover/row:opacity-100 pointer-coarse:opacity-100',
        className,
      )}
      {...props}
    />
  )
}
