import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** A quiet grouping surface: hairline border, no shadow. */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section className={cn('rounded-md border border-border bg-surface', className)} {...props} />
  )
}
