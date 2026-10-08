'use client'

import {
  ArrowLeftRight,
  CircleEllipsis,
  FileText,
  House,
  Search,
  SquareKanban,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { GlassButton } from '@/components/ui/glass-button'
import { cn } from '@/lib/utils'

import { useCommandPalette } from './command-palette'
import { isActive } from './nav'

type Tab = { href: string; label: string; icon: LucideIcon; covers: string[] }

/** The mobile tabs. More covers the pages that don't get a tab of their own. */
export const TABS: Tab[] = [
  { href: '/dashboard', label: 'Home', icon: House, covers: ['/dashboard'] },
  { href: '/transactions', label: 'Money', icon: ArrowLeftRight, covers: ['/transactions'] },
  { href: '/invoices', label: 'Invoices', icon: FileText, covers: ['/invoices'] },
  { href: '/projects', label: 'Projects', icon: SquareKanban, covers: ['/projects'] },
  {
    href: '/more',
    label: 'More',
    icon: CircleEllipsis,
    covers: ['/more', '/credentials', '/companies', '/settings'],
  },
]

/**
 * The floating Liquid Glass tab bar (mobile only), with search in its own
 * glass circle beside it, as in iOS 26. The selected tab sits on a lens that
 * slides between tabs.
 */
export function TabBar() {
  const pathname = usePathname()
  const palette = useCommandPalette()
  const active = TABS.findIndex((tab) => tab.covers.some((path) => isActive(pathname, path)))

  return (
    <div
      className="fixed inset-x-4 bottom-(--tab-bar-bottom) z-40 flex items-center gap-2 md:hidden print:hidden"
      data-tab-bar
    >
      <nav
        aria-label="Tabs"
        className="glass relative flex h-16 min-w-0 flex-1 items-center rounded-full p-1.5"
      >
        {active >= 0 ? (
          <span
            aria-hidden
            className="absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/5)] rounded-full bg-glass-lens transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(${active * 100}%)` }}
          />
        ) : null}
        {TABS.map((tab, index) => {
          const current = index === active
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-medium transition-colors duration-150',
                current ? 'text-accent' : 'text-muted active:text-fg',
              )}
            >
              <tab.icon aria-hidden className="size-6" />
              <span className="max-w-full truncate px-0.5">{tab.label}</span>
            </Link>
          )
        })}
      </nav>
      <GlassButton aria-label="Search" className="size-16 [&_svg]:size-6" onClick={palette.open}>
        <Search />
      </GlassButton>
    </div>
  )
}
