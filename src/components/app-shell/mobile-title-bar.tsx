'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { GlassButton } from '@/components/ui/glass-button'
import { cn } from '@/lib/utils'

export type BackTarget = {
  href: string
  label: string
  /** Only the mobile back button; desktop has the sidebar (or its own way back). */
  mobileOnly?: boolean
}

/**
 * The mobile title bar: floating glass buttons (back on the left, the page's
 * actions on the right) over a scroll-edge fade. Once the page's large title
 * scrolls under the bar, a compact copy of it fades in between the buttons.
 * Lives inside PageHeader, whose h1 is the large title.
 */
export function MobileTitleBar({ back, actions }: { back?: BackTarget; actions?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const [compactTitle, setCompactTitle] = useState<string | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const title = ref.current?.parentElement?.querySelector('h1')
    if (!title || !bar.current) return
    // The title counts as hidden once it passes under the buttons, whose
    // bottom depends on the device's safe area.
    const below = Math.round(bar.current.getBoundingClientRect().bottom)
    const text = visibleText(title)
    const observer = new IntersectionObserver(
      ([entry]) => setCompactTitle(entry?.isIntersecting ? null : text),
      { rootMargin: `-${below}px 0px 0px 0px` },
    )
    observer.observe(title)
    const onScroll = () => setScrolled(window.scrollY > 2)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div ref={ref} className="contents md:hidden">
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-30 h-[calc(var(--title-bar)+1.75rem)] transition-opacity duration-200 scroll-edge md:hidden',
          scrolled ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        ref={bar}
        className="fixed inset-x-0 top-[calc(var(--title-bar)-2.75rem)] z-40 grid h-11 grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2 px-4 md:hidden"
      >
        <div className="flex justify-start">
          {back ? (
            <GlassButton asChild aria-label={`Back to ${back.label}`}>
              <Link href={back.href}>
                <ChevronLeft />
              </Link>
            </GlassButton>
          ) : null}
        </div>
        <p
          aria-hidden
          className={cn(
            'truncate text-center text-md font-semibold transition-opacity duration-200',
            compactTitle ? 'opacity-100' : 'opacity-0',
          )}
        >
          {compactTitle}
        </p>
        <div className="flex items-center justify-end gap-2">{actions}</div>
      </div>
    </div>
  )
}

/** The title's text without decorative parts (e.g. a logo's initial). */
function visibleText(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement
  copy.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove())
  return copy.textContent?.trim() ?? ''
}
