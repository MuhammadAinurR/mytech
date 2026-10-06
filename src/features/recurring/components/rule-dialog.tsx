'use client'

import { Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { toDecimalString } from '@/lib/money'
import type { RecurringRule } from '@/server/queries/recurring'

import { type RecurringRuleFormValues } from '../schema'
import { RuleForm } from './rule-form'

const RuleDialogContext = createContext<{
  openCreate: () => void
  openEdit: (rule: RecurringRule) => void
} | null>(null)

export function useRuleDialog() {
  const context = useContext(RuleDialogContext)
  if (!context) throw new Error('useRuleDialog must be used inside RuleDialogProvider')
  return context
}

export function RuleDialogProvider({
  children,
  defaults,
  categories,
}: {
  children: ReactNode
  defaults: { currency: string; today: string }
  categories: string[]
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<{ open: boolean; rule: RecurringRule | null }>(() => ({
    open: searchParams.get('new') === '1',
    rule: null,
  }))

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }))
    if (searchParams.has('new')) router.replace(pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const value = useMemo(
    () => ({
      openCreate: () => setState({ open: true, rule: null }),
      openEdit: (rule: RecurringRule) => setState({ open: true, rule }),
    }),
    [],
  )

  const rule = state.rule
  const formDefaults: RecurringRuleFormValues = rule
    ? {
        label: rule.label,
        type: rule.type,
        amount: toDecimalString(rule.amountMinor, rule.currency),
        currency: rule.currency as RecurringRuleFormValues['currency'],
        category: rule.category,
        note: rule.note ?? '',
        frequency: rule.frequency,
        dayOfMonth: String(rule.dayOfMonth),
        monthOfYear: rule.monthOfYear ? String(rule.monthOfYear) : '',
        startsOn: rule.startsOn,
        endsOn: rule.endsOn ?? '',
        reminderDaysBefore: rule.reminderDaysBefore === null ? '' : String(rule.reminderDaysBefore),
      }
    : {
        label: '',
        type: 'expense',
        amount: '',
        currency: defaults.currency as RecurringRuleFormValues['currency'],
        category: '',
        note: '',
        frequency: 'monthly',
        dayOfMonth: String(Number(defaults.today.slice(8, 10))),
        monthOfYear: '',
        startsOn: defaults.today,
        endsOn: '',
        reminderDaysBefore: '',
      }

  return (
    <RuleDialogContext value={value}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent size="lg">
          <DialogHeader
            title={rule ? 'Edit rule' : 'New recurring rule'}
            description={
              rule
                ? 'Changes apply to entries created from now on.'
                : 'Entries are created automatically on each date.'
            }
          />
          <RuleForm
            key={rule?.id ?? 'new'}
            ruleId={rule?.id}
            defaultValues={formDefaults}
            categories={categories}
            today={defaults.today}
            onDone={close}
          />
        </DialogContent>
      </Dialog>
    </RuleDialogContext>
  )
}

export function NewRuleButton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const { openCreate } = useRuleDialog()
  return (
    <Button variant={variant} size={variant === 'primary' ? 'md' : 'sm'} onClick={openCreate}>
      <Plus />
      New rule
    </Button>
  )
}
