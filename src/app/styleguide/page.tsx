import { Download, Plus, Search } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { type ReactNode } from 'react'

import { Money } from '@/components/money'
import { ThemeSwitcher } from '@/components/theme/theme-switcher'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { Kbd } from '@/components/ui/kbd'
import { PageHeader } from '@/components/ui/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusDot } from '@/components/ui/status-dot'

import { FormDemo, GlassDemo, OverlayDemo, SegmentedDemo, TableDemo } from './demos'

export const metadata: Metadata = { title: 'Styleguide' }

const colorTokens: { name: string; className: string; role: string }[] = [
  { name: 'background', className: 'bg-background', role: 'App canvas and sidebar' },
  { name: 'surface', className: 'bg-surface', role: 'Content panel, inputs, tables' },
  { name: 'surface-raised', className: 'bg-surface-raised', role: 'Menus, popovers, dialogs' },
  { name: 'fill', className: 'bg-fill', role: 'Hover, selection, skeletons' },
  { name: 'fill-strong', className: 'bg-fill-strong', role: 'Pressed and active fills' },
  { name: 'border', className: 'bg-border', role: 'Hairline dividers' },
  { name: 'border-strong', className: 'bg-border-strong', role: 'Control outlines' },
  { name: 'text', className: 'bg-fg', role: 'Primary text' },
  { name: 'text-muted', className: 'bg-muted', role: 'Secondary text, labels' },
  { name: 'text-subtle', className: 'bg-subtle', role: 'Tertiary text, placeholders' },
  { name: 'accent', className: 'bg-accent', role: 'Primary action, focus, active state' },
  { name: 'success', className: 'bg-success', role: 'Paid, income, healthy' },
  { name: 'warning', className: 'bg-warning', role: 'Due soon, needs attention' },
  { name: 'danger', className: 'bg-danger', role: 'Overdue, destructive, errors' },
]

const typeScale = [
  { token: '2xl · 40/44 · 600', className: 'text-2xl font-semibold', sample: '$48,210.00' },
  { token: 'xl · 28/34 · 600', className: 'text-xl font-semibold', sample: 'October overview' },
  { token: 'lg · 20/28 · 600', className: 'text-lg font-semibold', sample: 'Transactions' },
  { token: 'md · 16/24 · 600', className: 'text-md font-semibold', sample: 'Upcoming renewals' },
  {
    token: 'base · 14/22 · 400',
    className: 'text-base',
    sample: 'Body copy reads comfortably at fourteen pixels with generous leading.',
  },
  {
    token: 'sm · 13/20 · 400–500',
    className: 'text-sm',
    sample: 'Tables, controls, and labels use thirteen pixels.',
  },
  {
    token: 'xs · 12/16 · 400–500',
    className: 'text-xs text-muted',
    sample: 'Column headers, hints',
  },
  { token: 'mono · 13', className: 'font-mono text-sm', sample: 'INV-2026-0042 · 9f3c2a7e' },
]

// Literal classes so Tailwind generates them.
const spacing = [
  ['h-1', 4],
  ['h-2', 8],
  ['h-3', 12],
  ['h-4', 16],
  ['h-5', 20],
  ['h-6', 24],
  ['h-8', 32],
  ['h-10', 40],
  ['h-12', 48],
  ['h-16', 64],
] as const

export default function StyleguidePage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <div className="min-h-dvh bg-surface">
      <main className="mx-auto max-w-5xl pb-24">
        <PageHeader
          title="Styleguide"
          description="Tokens and components, as defined in DESIGN.md. Development only."
          actions={<ThemeSwitcher />}
        />

        <Section title="Color" description="Neutrals carry the interface. Accent marks intent.">
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {colorTokens.map((token) => (
              <li key={token.name} className="flex items-center gap-3">
                <span
                  className={`size-8 shrink-0 rounded-sm border border-border ${token.className}`}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-mono text-sm">{token.name}</span>
                  <span className="truncate text-xs text-muted">{token.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title="Typography"
          description="Geist Sans for the interface, Geist Mono for identifiers."
        >
          <dl className="flex flex-col divide-y divide-border">
            {typeScale.map((row) => (
              <div
                key={row.token}
                className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:items-baseline"
              >
                <dt className="font-mono text-xs text-subtle">{row.token}</dt>
                <dd className={`${row.className} tabular`}>{row.sample}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-base">
            <span className="text-fg">Primary text</span>
            <span className="text-muted">Secondary text</span>
            <span className="text-subtle">Tertiary text</span>
          </div>
        </Section>

        <Section
          title="Spacing, radius, elevation"
          description="A 4px grid. Shadows only for floating layers."
        >
          <div className="flex flex-wrap items-end gap-3">
            {spacing.map(([height, px]) => (
              <div key={px} className="flex flex-col items-center gap-2">
                <div className={`w-3 rounded-xs bg-accent-soft ${height}`} />
                <span className="tabular text-xs text-subtle">{px}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-6">
            {[
              ['xs · 4', 'rounded-xs'],
              ['sm · 6', 'rounded-sm'],
              ['md · 10', 'rounded-md'],
              ['lg · 14', 'rounded-lg'],
            ].map(([label, radius]) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className={`size-14 border border-border-strong bg-fill ${radius}`} />
                <span className="text-xs text-subtle">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 bg-background p-6 sm:grid-cols-3">
            <div className="rounded-md bg-surface-raised p-4 text-sm shadow-popover">
              Popover · menus
            </div>
            <div className="rounded-lg bg-surface-raised p-4 text-sm shadow-dialog">Dialog</div>
            <div className="rounded-md bg-surface-raised p-4 text-sm shadow-drag">Dragged card</div>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">
              <Plus />
              New invoice
            </Button>
            <Button>Export</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete</Button>
            <Button variant="danger-ghost">Remove</Button>
            <Button variant="link">View all</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg" variant="primary">
              Large
            </Button>
            <Button size="icon" aria-label="Download">
              <Download />
            </Button>
            <Button size="icon-sm" variant="ghost" aria-label="Search">
              <Search />
            </Button>
            <Button variant="primary" loading>
              Saving
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section
          title="Form controls"
          description="Labels above, hints below, errors replace hints."
        >
          <FormDemo />
        </Section>

        <Section title="Table" description="Dense, aligned, quiet until hovered or focused." flush>
          <TableDemo />
        </Section>

        <Section title="Status">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <StatusDot>Draft</StatusDot>
            <StatusDot tone="accent">Sent</StatusDot>
            <StatusDot tone="success">Paid</StatusDot>
            <StatusDot tone="warning">Due in 3 days</StatusDot>
            <StatusDot tone="danger">Overdue</StatusDot>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-base">
            <Money amountMinor={420000} currency="USD" signed tone="positive" />
            <Money amountMinor={-1249} currency="USD" signed />
            <Money amountMinor={15_000_000} currency="IDR" />
            <Money amountMinor={98_000} currency="EUR" tone="muted" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            Open the command palette with <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </div>
        </Section>

        <Section title="Navigation and overlays">
          <div className="flex flex-col gap-6">
            <SegmentedDemo />
            <OverlayDemo />
          </div>
        </Section>

        <Section
          title="Liquid Glass (mobile)"
          description="Only the floating layer: tab bar, title bar buttons, sheets, menus, toasts, and the dashboard hero. Lists and forms stay solid."
        >
          <GlassDemo />
        </Section>

        <Section title="Empty, loading, and error states" flush>
          <div className="grid divide-border md:grid-cols-2 md:divide-x">
            <EmptyState
              title="No transactions in October"
              description="Record income or an expense to see your monthly summary."
              action={
                <Button variant="primary" size="sm">
                  <Plus />
                  Add transaction
                </Button>
              }
            />
            <ErrorState action={<Button size="sm">Try again</Button>} />
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-(--gutter) py-6">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  )
}

function Section({
  title,
  description,
  children,
  flush = false,
}: {
  title: string
  description?: string
  children: ReactNode
  flush?: boolean
}) {
  return (
    <section className="border-t border-border py-10">
      <div className="mb-6 flex flex-col gap-1 px-(--gutter)">
        <h2 className="text-md font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      <div className={flush ? undefined : 'px-(--gutter)'}>{children}</div>
    </section>
  )
}
