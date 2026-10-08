import { cn } from '@/lib/utils'

import { type ProjectProgress } from '../lib/progress'

/**
 * A thin track for how far through its dates a project is. Decorative: the
 * progress label beside it says the same in words.
 */
export function ProgressTrack({
  progress,
  className,
}: {
  progress: ProjectProgress
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('block h-1 overflow-hidden rounded-full bg-fill-strong', className)}
    >
      <span
        className={cn(
          'block h-full rounded-full',
          progress.phase === 'overdue' ? 'bg-danger' : 'bg-accent',
        )}
        style={{ width: `${progress.fraction * 100}%` }}
      />
    </span>
  )
}

/** The progress label, in the danger tone once overdue. */
export function ProgressLabel({ progress }: { progress: ProjectProgress }) {
  return <span className={cn(progress.phase === 'overdue' && 'text-danger')}>{progress.label}</span>
}
