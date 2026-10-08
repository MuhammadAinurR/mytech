'use client'

import { Ellipsis, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Money } from '@/components/money'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InsetButtonRow, InsetSection } from '@/components/ui/inset-list'
import { KeyboardRows } from '@/components/ui/keyboard-rows'
import { StatusDot } from '@/components/ui/status-dot'
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
import { describeDaysUntil, diffInDays, formatDateOnly } from '@/lib/dates'
import type { RuleWithNext } from '@/server/queries/recurring'

import { deleteRuleAction, setRuleActiveAction } from '../actions'
import { describeSchedule } from '../lib/recurrence'
import { useRuleDialog } from './rule-dialog'

export function RulesTable({ rules, today }: { rules: RuleWithNext[]; today: string }) {
  const { openEdit } = useRuleDialog()
  const [deleting, setDeleting] = useState<RuleWithNext | null>(null)

  async function toggle(rule: RuleWithNext) {
    const result = await setRuleActiveAction(rule.id, !rule.isActive)
    if (result.ok) toast.success(rule.isActive ? 'Rule paused' : 'Rule resumed')
    else toast.error('That rule no longer exists.')
  }

  async function confirmDelete() {
    if (!deleting) return
    const result = await deleteRuleAction(deleting.id)
    if (result.ok) toast.success('Rule deleted. Entries it already created were kept.')
    else toast.error('That rule no longer exists.')
  }

  return (
    <>
      <div className="max-md:hidden">
        <KeyboardRows label="Recurring rules">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-full md:w-1/3">Name</TableHead>
                <TableHead className="hidden md:table-cell">Schedule</TableHead>
                <TableHead className="hidden w-36 sm:table-cell">Next</TableHead>
                <TableHead numeric>Amount</TableHead>
                <TableHead className="hidden w-14 sm:table-cell">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow
                  key={rule.id}
                  data-row
                  className="cursor-pointer"
                  onClick={(event) => {
                    const target = event.target as HTMLElement
                    if (!event.currentTarget.contains(target) || target.closest('button, a')) return
                    openEdit(rule)
                  }}
                >
                  <TableCell className="max-w-0 py-2.5">
                    <button
                      type="button"
                      data-row-link
                      tabIndex={-1}
                      onClick={() => openEdit(rule)}
                      className={`block max-w-full cursor-pointer truncate text-left font-medium ${rule.isActive ? '' : 'text-muted'}`}
                    >
                      {rule.label}
                    </button>
                    <p className="hidden truncate text-xs text-muted sm:block">
                      {rule.category}
                      <span className="md:hidden"> · {describeSchedule(rule)}</span>
                    </p>
                    <p className="truncate text-xs text-muted sm:hidden">
                      {nextLabel(rule, today)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-muted md:table-cell">
                    {describeSchedule(rule)}
                    {rule.reminderDaysBefore !== null ? (
                      <span className="text-subtle">
                        {' '}
                        · reminds {rule.reminderDaysBefore}{' '}
                        {rule.reminderDaysBefore === 1 ? 'day' : 'days'} before
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">
                    {!rule.isActive ? (
                      <StatusDot>Paused</StatusDot>
                    ) : rule.nextOn ? (
                      <span className="flex flex-col">
                        <span className="tabular">
                          {formatDateOnly(rule.nextOn, {
                            style: rule.nextOn.startsWith(today.slice(0, 4)) ? 'short' : 'medium',
                          })}
                        </span>
                        <span className="text-xs text-muted">
                          {describeDaysUntil(diffInDays(today, rule.nextOn))}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted">Ended</span>
                    )}
                  </TableCell>
                  <TableCell numeric className="sm:w-36">
                    <Money
                      amountMinor={rule.type === 'income' ? rule.amountMinor : -rule.amountMinor}
                      currency={rule.currency}
                      signed
                      tone={
                        !rule.isActive ? 'muted' : rule.type === 'income' ? 'positive' : 'neutral'
                      }
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <RowActions>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            aria-label={`Actions for ${rule.label}`}
                          >
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => openEdit(rule)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void toggle(rule)}>
                            {rule.isActive ? <Pause /> : <Play />}
                            {rule.isActive ? 'Pause' : 'Resume'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem tone="danger" onSelect={() => setDeleting(rule)}>
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </KeyboardRows>
      </div>

      {/* Phones: an inset group; tap to edit, long-press for the row's menu. */}
      <InsetSection className="md:hidden">
        {rules.map((rule) => (
          <ContextMenu key={rule.id}>
            <ContextMenuTrigger asChild>
              <InsetButtonRow
                onClick={() => openEdit(rule)}
                title={
                  <span className={rule.isActive ? undefined : 'text-muted'}>{rule.label}</span>
                }
                subtitle={`${describeSchedule(rule)} · ${nextShort(rule, today)}`}
                trailing={
                  <Money
                    amountMinor={rule.type === 'income' ? rule.amountMinor : -rule.amountMinor}
                    currency={rule.currency}
                    signed
                    tone={
                      !rule.isActive ? 'muted' : rule.type === 'income' ? 'positive' : 'neutral'
                    }
                  />
                }
              />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onSelect={() => openEdit(rule)}>
                <Pencil />
                Edit
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => void toggle(rule)}>
                {rule.isActive ? <Pause /> : <Play />}
                {rule.isActive ? 'Pause' : 'Resume'}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem tone="danger" onSelect={() => setDeleting(rule)}>
                <Trash2 />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </InsetSection>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? null : setDeleting(null))}
        title={`Delete “${deleting?.label ?? ''}”?`}
        description="No new entries will be created. Entries it already created stay in your history."
        confirmLabel="Delete rule"
        onConfirm={confirmDelete}
      />
    </>
  )
}

function nextLabel(rule: RuleWithNext, today: string): string {
  if (!rule.isActive) return 'Paused'
  if (!rule.nextOn) return 'Ended'
  const date = formatDateOnly(rule.nextOn, {
    style: rule.nextOn.startsWith(today.slice(0, 4)) ? 'short' : 'medium',
  })
  return `${date} · ${describeDaysUntil(diffInDays(today, rule.nextOn))}`
}

/** The mobile subtitle's second half: the schedule already implies the date. */
function nextShort(rule: RuleWithNext, today: string): string {
  if (!rule.isActive) return 'Paused'
  if (!rule.nextOn) return 'Ended'
  return describeDaysUntil(diffInDays(today, rule.nextOn))
}
