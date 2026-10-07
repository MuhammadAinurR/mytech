'use client'

import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  Copy,
  Ellipsis,
  FileText,
  House,
  Pencil,
  Plus,
  Printer,
  Search,
  SquareKanban,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import { Money } from '@/components/money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CheckboxField } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { GlassButton } from '@/components/ui/glass-button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { KeyboardRows } from '@/components/ui/keyboard-rows'
import { SegmentedControl } from '@/components/ui/segmented'
import { StatusDot, type StatusTone } from '@/components/ui/status-dot'
import {
  RowActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toaster'
import { Popover, PopoverContent, PopoverTrigger, Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function FormDemo() {
  return (
    <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
      <Field label="Description" required hint="Shown on statements and in search.">
        <Input defaultValue="Design retainer · October" />
      </Field>
      <Field label="Amount" required error="Enter an amount greater than zero.">
        <Input inputMode="decimal" defaultValue="0" className="text-right tabular" />
      </Field>
      <Field label="Category">
        <Select defaultValue="hosting">
          <option value="hosting">Hosting</option>
          <option value="software">Software</option>
          <option value="client-work">Client work</option>
        </Select>
      </Field>
      <Field label="Date" required>
        <Input type="date" defaultValue="2026-10-07" />
      </Field>
      <Field label="Account" hint="Locked after the first payment.">
        <Input defaultValue="Operating" disabled />
      </Field>
      <Field label="Search">
        <Input placeholder="Label, host, or type" />
      </Field>
      <Field label="Note" className="sm:col-span-2">
        <Textarea placeholder="Anything you want to remember about this entry" />
      </Field>
      <CheckboxField
        className="sm:col-span-2"
        label="Save to Rofiq Studio’s clients"
        hint="Pick them on the next invoice instead of typing their details."
        defaultChecked
      />
      <CheckboxField label="Remind me a day before" />
    </div>
  )
}

const rows: {
  id: string
  date: string
  description: string
  category: string
  status: [StatusTone, string]
  amount: number
}[] = [
  {
    id: '1',
    date: 'Oct 6',
    description: 'Design retainer · October',
    category: 'Client work',
    status: ['success', 'Paid'],
    amount: 420000,
  },
  {
    id: '2',
    date: 'Oct 4',
    description: 'VPS hosting · 2 vCPU',
    category: 'Hosting',
    status: ['neutral', 'Recurring'],
    amount: -1249,
  },
  {
    id: '3',
    date: 'Oct 2',
    description: 'Domain renewal · workbench.dev',
    category: 'Domains',
    status: ['warning', 'Renews in 3 days'],
    amount: -1800,
  },
  {
    id: '4',
    date: 'Sep 29',
    description: 'Code signing certificate',
    category: 'Software',
    status: ['danger', 'Expired'],
    amount: -21900,
  },
]

export function TableDemo() {
  return (
    <KeyboardRows label="Sample transactions">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead numeric>Amount</TableHead>
            <TableHead className="hidden w-20 sm:table-cell">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} data-row>
              <TableCell className="tabular text-muted">{row.date}</TableCell>
              <TableCell className="font-medium">
                <button
                  type="button"
                  data-row-link
                  className="cursor-pointer text-left"
                  onClick={() => toast(`Opened “${row.description}”`)}
                  tabIndex={-1}
                >
                  {row.description}
                </button>
              </TableCell>
              <TableCell className="hidden text-muted md:table-cell">{row.category}</TableCell>
              <TableCell className="hidden sm:table-cell">
                <StatusDot tone={row.status[0]}>{row.status[1]}</StatusDot>
              </TableCell>
              <TableCell numeric>
                <Money
                  amountMinor={row.amount}
                  currency="USD"
                  signed
                  tone={row.amount > 0 ? 'positive' : 'neutral'}
                />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <RowActions>
                  <Tooltip content="Edit">
                    <Button size="icon-sm" variant="ghost" aria-label="Edit">
                      <Pencil />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Delete">
                    <Button size="icon-sm" variant="ghost" aria-label="Delete">
                      <Trash2 />
                    </Button>
                  </Tooltip>
                </RowActions>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </KeyboardRows>
  )
}

export function SegmentedDemo() {
  const [view, setView] = useState<'board' | 'calendar'>('board')
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all')
  return (
    <div className="flex flex-wrap gap-4">
      <SegmentedControl
        label="View"
        value={view}
        onValueChange={setView}
        options={[
          {
            value: 'board',
            label: (
              <>
                <SquareKanban />
                Board
              </>
            ),
          },
          {
            value: 'calendar',
            label: (
              <>
                <CalendarDays />
                Calendar
              </>
            ),
          },
        ]}
      />
      <SegmentedControl
        label="Type"
        value={type}
        onValueChange={setType}
        options={[
          { value: 'all', label: 'All' },
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
        ]}
      />
    </div>
  )
}

export function OverlayDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader
            title="New company"
            description="Invoices issued from this company use its details and numbering."
          />
          <DialogBody className="flex flex-col gap-4">
            <Field label="Legal name" required>
              <Input placeholder="Studio Rofiq" />
            </Field>
            <Field label="Default currency" required>
              <Select defaultValue="USD">
                <option>USD</option>
                <option>IDR</option>
              </Select>
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="primary">Create company</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        trigger={<Button variant="danger-ghost">Delete credential</Button>}
        title="Delete this credential?"
        description="The secret is removed for good. This can’t be undone."
        confirmLabel="Delete"
        onConfirm={() => toast('Credential deleted')}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" aria-label="More actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>INV-2026-0042</DropdownMenuLabel>
          <DropdownMenuItem>
            <Printer />
            Print
            <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="danger">
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost">Popover</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-sm font-medium">Reminder lead time</p>
          <p className="mt-1 text-sm text-muted">
            You will see this renewal on the dashboard 14 days before it is due.
          </p>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        onClick={() =>
          toast.success('Invoice marked as paid', {
            action: { label: 'Undo', onClick: () => undefined },
          })
        }
      >
        Show toast
      </Button>
    </div>
  )
}

/**
 * The mobile floating layer on a phone-sized frame: the hero card over the
 * ambient field, glass circles, and a tab bar capsule over scrolling content,
 * so the blur and rim light can be judged against real text.
 */
export function GlassDemo() {
  const rows = [
    ['Hosting · VPS 2 vCPU', 'Oct 6', '−$12.49'],
    ['Design retainer', 'Oct 4', '+$4,200.00'],
    ['Domain renewal', 'Oct 2', '−$18.00'],
    ['Code signing certificate', 'Sep 29', '−$219.00'],
    ['Client lunch', 'Sep 28', '−$46.20'],
    ['Stock photos', 'Sep 26', '−$29.00'],
  ]
  return (
    <div className="relative mx-auto h-[640px] w-[390px] max-w-full overflow-hidden rounded-[44px] border border-border bg-background">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[34rem] ambient-field" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-14">
        <GlassButton aria-label="Back">
          <ChevronLeft />
        </GlassButton>
        <GlassButton aria-label="Add" variant="accent">
          <Plus />
        </GlassButton>
      </div>
      <div className="relative px-4 pt-32">
        <div className="glass relative rounded-2xl p-5 glass-hero">
          <p className="text-sm text-muted">Net in October</p>
          <p className="mt-1 tabular text-2xl font-semibold">$3,875.31</p>
          <p className="mt-1 text-sm text-muted">
            <span className="tabular text-fg">$4,200.00</span> in ·{' '}
            <span className="tabular text-fg">$324.69</span> out
          </p>
        </div>
        <div className="mt-6 overflow-hidden rounded-lg bg-surface">
          {rows.map(([title, date, amount]) => (
            <div
              key={title}
              className="flex min-h-13 items-center gap-3 border-b border-border px-4 py-2 last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-md">{title}</p>
                <p className="text-sm text-muted">{date}</p>
              </div>
              <p className="tabular text-md">{amount}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-6 flex items-center gap-2">
        <nav
          aria-label="Tab bar preview"
          className="glass relative flex h-16 flex-1 items-center justify-between rounded-full px-1.5"
        >
          {[
            [House, 'Home', true],
            [ArrowLeftRight, 'Money', false],
            [FileText, 'Invoices', false],
            [SquareKanban, 'Projects', false],
            [Ellipsis, 'More', false],
          ].map(([Icon, label, active]) => {
            const TabIcon = Icon as typeof House
            return (
              <span
                key={label as string}
                className={cn(
                  'relative flex h-13 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-medium',
                  active ? 'bg-fill/70 text-accent' : 'text-muted',
                )}
              >
                <TabIcon className="size-6" aria-hidden />
                {label as string}
              </span>
            )
          })}
        </nav>
        <GlassButton aria-label="Search" className="size-16">
          <Search />
        </GlassButton>
      </div>
    </div>
  )
}
