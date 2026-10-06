'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'

import { Logo } from '@/components/logo'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

import { useCommandPalette } from './command-palette'
import { isActive, NAV_ITEMS } from './nav'
import { UserMenu, type ShellUser } from './user-menu'

const noopSubscribe = () => () => {}
const isMac = () => /mac|iphone|ipad/i.test(navigator.platform)

export function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  const pathname = usePathname()
  const palette = useCommandPalette()
  const mac = useSyncExternalStore(noopSubscribe, isMac, () => true)

  return (
    <div className="flex h-full flex-col gap-4 px-3 py-4">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mx-2 inline-flex w-fit rounded-sm"
        aria-label="Workbench, go to dashboard"
      >
        <Logo />
      </Link>

      <button
        type="button"
        onClick={() => {
          onNavigate?.()
          palette.open()
        }}
        className="flex h-8 cursor-pointer items-center gap-2 rounded-sm border border-border bg-surface px-2 text-sm text-subtle transition-colors hover:border-border-strong hover:text-muted"
      >
        <Search aria-hidden className="size-4" />
        <span className="flex-1 text-left">Search</span>
        <span className="hidden items-center gap-0.5 md:flex" aria-hidden>
          <Kbd>{mac ? '⌘' : 'Ctrl'}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-8 items-center gap-2.5 rounded-sm px-2 text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-fill text-fg [&_svg]:text-accent'
                  : 'text-muted hover:bg-fill/60 hover:text-fg [&_svg]:text-subtle',
              )}
            >
              <item.icon aria-hidden className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto">
        <UserMenu user={user} />
      </div>
    </div>
  )
}
