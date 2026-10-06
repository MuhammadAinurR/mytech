import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** One line of useful copy and, at most, one action. */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
    >
      {icon ? <div className="text-subtle [&_svg]:size-5">{icon}</div> : null}
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-base font-medium text-fg">{title}</p>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
