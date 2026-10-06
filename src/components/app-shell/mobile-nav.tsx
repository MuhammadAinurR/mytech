'use client'

import { Menu, Search } from 'lucide-react'
import Link from 'next/link'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useState } from 'react'

import { LogoMark } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useCommandPalette } from './command-palette'
import { SidebarContent } from './sidebar'
import { type ShellUser } from './user-menu'

/** Top bar and slide-in navigation below the md breakpoint. */
export function MobileNav({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false)
  const palette = useCommandPalette()

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background px-2 md:hidden">
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu />
          </Button>
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-scrim',
              'data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
            )}
          />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-background shadow-dialog outline-none',
              'data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in',
            )}
          >
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <Link href="/dashboard" aria-label="Workbench, go to dashboard" className="rounded-sm">
        <LogoMark />
      </Link>

      <Button variant="ghost" size="icon" aria-label="Search" onClick={palette.open}>
        <Search />
      </Button>
    </header>
  )
}
