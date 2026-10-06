import { type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const tones = {
  neutral: 'bg-subtle',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
} as const

export type StatusTone = keyof typeof tones

/** Status as plain text with a small dot: no pills, no tinted backgrounds. */
export function StatusDot({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap', className)}>
      <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', tones[tone])} />
      {children}
    </span>
  )
}
