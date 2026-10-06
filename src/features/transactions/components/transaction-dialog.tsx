'use client'

import { Plus } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import { toDecimalString } from '@/lib/money'
import type { TransactionItem } from '@/server/queries/transactions'

import { type TransactionFormValues } from '../schema'
import { TransactionForm } from './transaction-form'

type DialogState = {
  open: boolean
  item: TransactionItem | null
  /** "duplicate" prefills from `item` but creates a new transaction dated today. */
  mode: 'create' | 'edit' | 'duplicate'
}

const TransactionDialogContext = createContext<{
  openCreate: () => void
  openEdit: (item: TransactionItem) => void
  openDuplicate: (item: TransactionItem) => void
} | null>(null)

export function useTransactionDialog() {
  const context = useContext(TransactionDialogContext)
  if (!context) throw new Error('useTransactionDialog must be used inside its provider')
  return context
}

/**
 * One dialog for creating and editing transactions. `?new=1` (from the command
 * palette) opens it on load; closing removes the parameter again.
 */
export function TransactionDialogProvider({
  children,
  defaults,
  categories,
}: {
  children: ReactNode
  defaults: { currency: string; date: string }
  categories: string[]
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<DialogState>(() => ({
    open: searchParams.get('new') === '1',
    item: null,
    mode: 'create',
  }))

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }))
    if (searchParams.has('new')) {
      const params = new URLSearchParams(searchParams)
      params.delete('new')
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }
  }, [pathname, router, searchParams])

  const value = useMemo(
    () => ({
      openCreate: () => setState({ open: true, item: null, mode: 'create' }),
      openEdit: (item: TransactionItem) => setState({ open: true, item, mode: 'edit' }),
      openDuplicate: (item: TransactionItem) => setState({ open: true, item, mode: 'duplicate' }),
    }),
    [],
  )

  const item = state.item
  const editing = state.mode === 'edit' ? item : null
  const formDefaults: TransactionFormValues = item
    ? {
        type: item.type,
        amount: toDecimalString(item.amountMinor, item.currency),
        currency: item.currency as TransactionFormValues['currency'],
        category: item.category,
        occurredOn: state.mode === 'duplicate' ? defaults.date : item.occurredOn,
        note: item.note ?? '',
      }
    : {
        type: 'expense',
        amount: '',
        currency: defaults.currency as TransactionFormValues['currency'],
        category: '',
        occurredOn: defaults.date,
        note: '',
      }

  return (
    <TransactionDialogContext value={value}>
      {children}
      <Dialog open={state.open} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent size="md">
          <DialogHeader
            title={editing ? 'Edit transaction' : 'New transaction'}
            description={editing ? undefined : 'Record money in or out.'}
          />
          <TransactionForm
            key={`${state.mode}-${item?.id ?? 'new'}`}
            transactionId={editing?.id}
            defaultValues={formDefaults}
            categories={categories}
            onDone={close}
          />
        </DialogContent>
      </Dialog>
    </TransactionDialogContext>
  )
}

export function AddTransactionButton({
  label = 'Add transaction',
  variant = 'primary',
}: {
  label?: string
  variant?: 'primary' | 'secondary'
}) {
  const { openCreate } = useTransactionDialog()
  return (
    <Button variant={variant} size={variant === 'primary' ? 'md' : 'sm'} onClick={openCreate}>
      <Plus />
      {label}
    </Button>
  )
}
