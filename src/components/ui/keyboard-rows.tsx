'use client'

import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

/**
 * Roving keyboard navigation for table rows. Rows marked `data-row` form one
 * tab stop; ArrowUp/ArrowDown (or j/k) move between them, Home/End jump, and
 * Enter activates the row's `data-row-link`.
 */
export function KeyboardRows({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const rows = useCallback(
    () => Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-row]') ?? []),
    [],
  )

  useEffect(() => {
    const all = rows()
    all.forEach((row, index) => row.setAttribute('tabindex', index === 0 ? '0' : '-1'))
  }, [rows, children])

  function focusRow(next: HTMLElement | undefined) {
    if (!next) return
    for (const row of rows()) row.setAttribute('tabindex', row === next ? '0' : '-1')
    next.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (!target.hasAttribute('data-row')) return
    const all = rows()
    const index = all.indexOf(target)

    switch (event.key) {
      case 'ArrowDown':
      case 'j':
        event.preventDefault()
        focusRow(all[Math.min(index + 1, all.length - 1)])
        break
      case 'ArrowUp':
      case 'k':
        event.preventDefault()
        focusRow(all[Math.max(index - 1, 0)])
        break
      case 'Home':
        event.preventDefault()
        focusRow(all[0])
        break
      case 'End':
        event.preventDefault()
        focusRow(all.at(-1))
        break
      case 'Enter':
        target.querySelector<HTMLElement>('[data-row-link]')?.click()
        break
    }
  }

  return (
    // The group only delegates key events from the focusable rows inside it.
    <div ref={ref} onKeyDown={onKeyDown} aria-label={label} role="group">
      {children}
    </div>
  )
}
