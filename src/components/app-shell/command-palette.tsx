'use client'

import { Command } from 'cmdk'
import { ArrowRight, Monitor, Moon, Plus, Search, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { dialogSurfaceClasses } from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

import { CREATE_ITEMS, NAV_ITEMS } from './nav'

const PaletteContext = createContext<{ open: () => void } | null>(null)

export function useCommandPalette() {
  const context = useContext(PaletteContext)
  if (!context) throw new Error('useCommandPalette must be used inside CommandPaletteProvider')
  return context
}

/** ⌘K / Ctrl+K: jump to any section or start creating something. */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { setTheme } = useTheme()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const run = useCallback((action: () => void) => {
    setIsOpen(false)
    action()
  }, [])

  const value = useMemo(() => ({ open: () => setIsOpen(true) }), [])

  return (
    <PaletteContext value={value}>
      {children}
      <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 overflow-y-auto bg-scrim px-4 pt-16 sm:pt-32',
              'data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
            )}
          >
            <DialogPrimitive.Content
              className={cn(dialogSurfaceClasses, 'mx-auto max-w-xl overflow-hidden')}
              aria-describedby={undefined}
            >
              <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>
              <Command loop label="Command palette" className="flex flex-col">
                <div className="flex items-center gap-2 border-b border-border px-4">
                  <Search aria-hidden className="size-4 text-subtle" />
                  <Command.Input
                    autoFocus
                    placeholder="Search or jump to…"
                    className="h-12 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-subtle"
                  />
                  <Kbd>Esc</Kbd>
                </div>
                <Command.List className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
                  <Command.Empty className="px-3 py-8 text-center text-sm text-muted">
                    Nothing matches that search.
                  </Command.Empty>
                  <PaletteGroup heading="Go to">
                    {NAV_ITEMS.map((item) => (
                      <PaletteItem
                        key={item.href}
                        value={`go ${item.label}`}
                        keywords={item.keywords}
                        onSelect={() => run(() => router.push(item.href))}
                        icon={<item.icon />}
                        hint={<ArrowRight />}
                      >
                        {item.label}
                      </PaletteItem>
                    ))}
                  </PaletteGroup>
                  <PaletteGroup heading="Create">
                    {CREATE_ITEMS.map((item) => (
                      <PaletteItem
                        key={item.href}
                        value={item.label}
                        keywords={[...item.keywords]}
                        onSelect={() => run(() => router.push(item.href))}
                        icon={<Plus />}
                      >
                        {item.label}
                      </PaletteItem>
                    ))}
                  </PaletteGroup>
                  <PaletteGroup heading="Theme">
                    <PaletteItem
                      value="theme light"
                      icon={<Sun />}
                      onSelect={() => run(() => setTheme('light'))}
                    >
                      Light theme
                    </PaletteItem>
                    <PaletteItem
                      value="theme dark"
                      icon={<Moon />}
                      onSelect={() => run(() => setTheme('dark'))}
                    >
                      Dark theme
                    </PaletteItem>
                    <PaletteItem
                      value="theme system"
                      icon={<Monitor />}
                      onSelect={() => run(() => setTheme('system'))}
                    >
                      Match system theme
                    </PaletteItem>
                  </PaletteGroup>
                </Command.List>
              </Command>
            </DialogPrimitive.Content>
          </DialogPrimitive.Overlay>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </PaletteContext>
  )
}

function PaletteGroup({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-subtle"
    >
      {children}
    </Command.Group>
  )
}

function PaletteItem({
  children,
  icon,
  hint,
  ...props
}: {
  children: ReactNode
  icon: ReactNode
  hint?: ReactNode
  value: string
  keywords?: string[]
  onSelect: () => void
}) {
  return (
    <Command.Item
      {...props}
      className={cn(
        'group flex h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2 text-sm text-fg select-none',
        'data-[selected=true]:bg-fill [&_svg]:size-4 [&_svg]:text-muted',
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {hint ? (
        <span className="opacity-0 group-data-[selected=true]:opacity-100">{hint}</span>
      ) : null}
    </Command.Item>
  )
}
