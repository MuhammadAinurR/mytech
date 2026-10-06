'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DialogBody, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { SegmentedControl } from '@/components/ui/segmented'
import { toast } from '@/components/ui/toaster'
import { applyFieldErrors } from '@/lib/forms'
import { CURRENCIES } from '@/lib/money'

import { createTransactionAction, updateTransactionAction } from '../actions'
import { transactionFormSchema, type TransactionFormValues } from '../schema'

export function TransactionForm({
  transactionId,
  defaultValues,
  categories,
  onDone,
}: {
  transactionId?: string
  defaultValues: TransactionFormValues
  categories: string[]
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const listId = useId()
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = transactionId
        ? await updateTransactionAction(transactionId, values)
        : await createTransactionAction(values)
      if (result.ok) {
        toast.success(transactionId ? 'Transaction updated' : 'Transaction added')
        onDone()
      } else if (result.error === 'not_found') {
        toast.error('That transaction no longer exists.')
        onDone()
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('The transaction wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogBody className="flex flex-col gap-5">
        <Controller
          control={form.control}
          name="type"
          render={({ field }) => (
            <SegmentedControl
              label="Type"
              className="self-start"
              value={field.value}
              onValueChange={field.onChange}
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
            />
          )}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
          <Field label="Amount" required error={errors.amount?.message}>
            <Input
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              placeholder="0.00"
              className="text-right tabular"
              {...form.register('amount')}
            />
          </Field>
          <Field label="Currency" required error={errors.currency?.message}>
            <Select {...form.register('currency')}>
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-3">
          <Field label="Category" required error={errors.category?.message}>
            <Input
              list={listId}
              autoComplete="off"
              placeholder="Hosting, Retainer, Software…"
              {...form.register('category')}
            />
          </Field>
          <Field label="Date" required error={errors.occurredOn?.message}>
            <Input type="date" {...form.register('occurredOn')} />
          </Field>
        </div>
        <datalist id={listId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <Field label="Note" error={errors.note?.message}>
          <Textarea rows={2} {...form.register('note')} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {transactionId ? 'Save changes' : 'Add transaction'}
        </Button>
      </DialogFooter>
    </form>
  )
}
