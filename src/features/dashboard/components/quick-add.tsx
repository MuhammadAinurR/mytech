import { ArrowLeftRight, FileText, SquareKanban } from 'lucide-react'
import Link from 'next/link'

const ACTIONS = [
  { href: '/transactions?new=1', label: 'Transaction', icon: ArrowLeftRight },
  { href: '/invoices/new', label: 'Invoice', icon: FileText },
  { href: '/projects?new=1', label: 'Project', icon: SquareKanban },
] as const

/** Mobile only: start the common things from Home, one tap each. */
export function QuickAdd() {
  return (
    <section aria-labelledby="quick-add" className="flex flex-col gap-1.5 md:hidden">
      <h2 id="quick-add" className="px-4 text-xs text-muted">
        Add
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            aria-label={`New ${action.label.toLowerCase()}`}
            className="flex min-h-18 flex-col items-center justify-center gap-1.5 rounded-lg bg-surface text-sm font-medium text-fg transition-colors duration-150 active:bg-fill"
          >
            <action.icon aria-hidden className="size-5 text-accent" />
            {action.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
