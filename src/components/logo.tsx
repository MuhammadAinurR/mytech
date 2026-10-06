import { cn } from '@/lib/utils'

/** The Workbench mark: a bench top over a shelf. Inherits the text color. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn('size-5 shrink-0', className)} fill="none">
      <rect width="20" height="20" rx="6" fill="currentColor" />
      <rect x="4.5" y="6" width="11" height="2.5" rx="1" className="fill-background" />
      <rect x="6.5" y="11.5" width="7" height="2.5" rx="1" className="fill-background" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 text-base font-semibold text-fg', className)}
    >
      <LogoMark />
      Workbench
    </span>
  )
}
