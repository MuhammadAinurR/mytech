import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Inset grouped lists, the mobile list style (DESIGN.md → Mobile): a
 * rounded surface group on the canvas, 16px from the screen edge, with
 * hairlines inset to the text. Pages using them mark their root
 * `data-grouped` so the mobile canvas turns to `background` behind them.
 */
export function InsetSection({
  title,
  footer,
  children,
  className,
}: {
  title?: ReactNode
  footer?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('px-4 md:px-(--gutter)', className)}>
      {title ? <h2 className="px-4 pb-1.5 text-xs text-muted">{title}</h2> : null}
      <div className="overflow-hidden rounded-lg bg-surface md:border md:border-border">
        {children}
      </div>
      {footer ? <p className="px-4 pt-1.5 text-xs text-muted">{footer}</p> : null}
    </section>
  )
}

type RowContent = {
  title: ReactNode
  subtitle?: ReactNode
  /** A 28px icon tile on the leading edge. */
  icon?: ReactNode
  /** Anything else on the leading edge (e.g. an avatar), drawn as is. */
  leading?: ReactNode
  trailing?: ReactNode
  /** A line below the subtitle, e.g. a progress track. */
  detail?: ReactNode
  tone?: 'default' | 'danger'
}

function IconTile({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-fill-strong text-fg [&_svg]:size-4"
    >
      {children}
    </span>
  )
}

function RowBody({
  title,
  subtitle,
  icon,
  leading,
  trailing,
  detail,
  tone = 'default',
  chevron,
}: RowContent & { chevron: boolean }) {
  return (
    <>
      {leading}
      {icon ? <IconTile>{icon}</IconTile> : null}
      <span className="flex min-h-13 min-w-0 flex-1 items-center gap-3 border-b border-border py-2 pr-4 group-last/row:border-b-0">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn('truncate text-md', tone === 'danger' && 'text-danger')}>
            {title}
          </span>
          {subtitle ? <span className="truncate text-sm text-muted">{subtitle}</span> : null}
          {detail ? <span className="block pt-2 pb-1">{detail}</span> : null}
        </span>
        {trailing ? <span className="shrink-0 tabular text-md">{trailing}</span> : null}
        {chevron ? <ChevronRight aria-hidden className="size-4 shrink-0 text-subtle" /> : null}
      </span>
    </>
  )
}

const rowClasses =
  'group/row flex w-full items-center gap-3 pl-4 text-left text-fg transition-colors duration-150 active:bg-fill'

const pressableClasses = 'select-none [-webkit-touch-callout:none]'

/** A row that navigates (with a chevron). */
export function InsetLinkRow({
  title,
  subtitle,
  icon,
  leading,
  trailing,
  detail,
  tone,
  className,
  ...link
}: RowContent & Omit<ComponentProps<typeof Link>, 'title' | 'children'>) {
  // Forwards the rest (and ref) so a context-menu trigger can wrap it.
  return (
    <Link className={cn(rowClasses, pressableClasses, className)} {...link}>
      <RowBody {...{ title, subtitle, icon, leading, trailing, detail, tone }} chevron />
    </Link>
  )
}

/** A row that acts in place (no chevron), e.g. sign out. */
export function InsetButtonRow({
  type = 'button',
  title,
  subtitle,
  icon,
  leading,
  trailing,
  detail,
  tone,
  className,
  ...button
}: RowContent & Omit<ComponentProps<'button'>, 'title' | 'children'>) {
  // Forwards the rest (and ref) so a context-menu trigger can wrap it.
  return (
    <button
      type={type}
      className={cn(rowClasses, 'cursor-pointer', pressableClasses, className)}
      {...button}
    >
      <RowBody {...{ title, subtitle, icon, leading, trailing, detail, tone }} chevron={false} />
    </button>
  )
}

/**
 * A row that opens something when tapped and keeps its own buttons on the
 * trailing edge (e.g. reveal and copy), which a whole-row button can't hold.
 */
export function InsetActionRow({
  title,
  subtitle,
  icon,
  leading,
  controls,
  onOpen,
  className,
  ...row
}: Omit<RowContent, 'trailing' | 'detail' | 'tone'> & {
  controls: ReactNode
  onOpen: () => void
} & Omit<ComponentProps<'div'>, 'title' | 'children'>) {
  // Forwards the rest (and ref) so a context-menu trigger can wrap it.
  return (
    <div
      className={cn(
        'group/row flex w-full items-center gap-3 pl-4 text-fg transition-colors duration-150 has-[[data-row-open]:active]:bg-fill',
        pressableClasses,
        className,
      )}
      {...row}
    >
      {leading}
      {icon ? <IconTile>{icon}</IconTile> : null}
      <span className="flex min-h-13 min-w-0 flex-1 items-center gap-1 border-b border-border pr-2 group-last/row:border-b-0">
        <button
          type="button"
          data-row-open
          onClick={onOpen}
          className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center self-stretch py-2 text-left"
        >
          <span className="truncate text-md">{title}</span>
          {subtitle ? <span className="truncate text-sm text-muted">{subtitle}</span> : null}
        </button>
        <span className="flex shrink-0 items-center">{controls}</span>
      </span>
    </div>
  )
}

/** A read-only row (no action), e.g. an upcoming renewal. */
export function InsetRowStatic(content: RowContent) {
  return (
    <div className="group/row flex w-full items-center gap-3 pl-4 text-fg">
      <RowBody {...content} chevron={false} />
    </div>
  )
}

/** A row holding a control (a segmented switch, a toggle). */
export function InsetRow({
  children,
  ...content
}: Omit<RowContent, 'trailing'> & { children: ReactNode }) {
  return (
    <div className={rowClasses.replace('active:bg-fill', '')}>
      <RowBody {...content} trailing={children} chevron={false} />
    </div>
  )
}
