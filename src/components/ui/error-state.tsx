import { CircleAlert } from 'lucide-react'
import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Calm failure message: what happened, in plain words, and one way forward. */
export function ErrorState({
  title = 'This didn’t load',
  description = 'Something went wrong on our side. Your data is safe. Try again in a moment.',
  action,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      <CircleAlert aria-hidden className="size-5 text-subtle" />
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-base font-medium text-fg">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
