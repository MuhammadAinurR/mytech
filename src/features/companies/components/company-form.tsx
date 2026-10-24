'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { DialogBody, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { bankTransfer, TRANSFER_TEXT } from '@/features/invoices/lib/payment'
import { formatInvoiceNumber } from '@/features/invoices/lib/totals'
import { applyFieldErrors } from '@/lib/forms'
import { CURRENCIES } from '@/lib/money'

import { createCompanyAction, updateCompanyAction } from '../actions'
import { companyFormSchema, type CompanyFormValues } from '../schema'

export function CompanyForm({
  companyId,
  defaultValues,
  onDone,
}: {
  companyId?: string
  defaultValues: CompanyFormValues
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors } = form.formState
  const [prefix, next] = useWatch({
    control: form.control,
    name: ['invoicePrefix', 'nextInvoiceNumber'],
  })
  const preview =
    /^\d{1,9}$/.test(next) && Number(next) >= 1 ? formatInvoiceNumber(prefix, Number(next)) : null
  const [bankName, bankAccountNumber, bankAccountName] = useWatch({
    control: form.control,
    name: ['bankName', 'bankAccountNumber', 'bankAccountName'],
  })
  // The sentence unpaid invoices will print, once all three are filled in.
  const transfer = bankTransfer(
    {
      bankName: bankName?.trim() || null,
      bankAccountNumber: bankAccountNumber?.trim().replace(/\s+/g, ' ') || null,
      bankAccountName: bankAccountName?.trim() || null,
    },
    'sent',
  )

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = companyId
        ? await updateCompanyAction(companyId, values)
        : await createCompanyAction(values)
      if (result.ok) {
        toast.success(companyId ? 'Company updated' : 'Company added')
        onDone()
      } else if (result.error === 'not_found') {
        toast.error('That company no longer exists.')
        onDone()
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('The company wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogBody className="flex flex-col gap-5">
        <Field label="Name" required error={errors.name?.message}>
          <Input autoFocus autoComplete="organization" {...form.register('name')} />
        </Field>
        <Field label="Address" error={errors.address?.message}>
          <Textarea rows={3} autoComplete="street-address" {...form.register('address')} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
          <Field label="Tax ID" error={errors.taxId?.message}>
            <Input className="font-mono" {...form.register('taxId')} />
          </Field>
          <Field label="Billing email" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...form.register('email')} />
          </Field>
        </div>
        <fieldset className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Bank account</legend>
          <p className="-mt-1 text-xs text-muted sm:col-span-2">
            Optional. Unpaid invoices ask clients to transfer payment to this account.
          </p>
          <Field label="Bank" hideOptional error={errors.bankName?.message}>
            <Input autoComplete="off" placeholder="BNI" {...form.register('bankName')} />
          </Field>
          <Field label="Account number" hideOptional error={errors.bankAccountNumber?.message}>
            <Input
              className="font-mono"
              autoComplete="off"
              spellCheck={false}
              {...form.register('bankAccountNumber')}
            />
          </Field>
          <Field
            label="Account holder"
            hideOptional
            className="sm:col-span-2"
            error={errors.bankAccountName?.message}
          >
            <Input
              autoComplete="off"
              placeholder="As registered with the bank"
              {...form.register('bankAccountName')}
            />
          </Field>
          {transfer ? (
            <p className="text-sm text-muted sm:col-span-2" aria-live="polite">
              Invoices will say:{' '}
              <span className="text-fg">
                {TRANSFER_TEXT.before(transfer.bankName)}
                <span className="font-mono whitespace-nowrap">{transfer.accountNumber}</span>
                {TRANSFER_TEXT.after(transfer.accountName)}
              </span>
            </p>
          ) : null}
        </fieldset>
        <Field
          label="Payment details"
          hint="Printed at the bottom of each invoice: payment link, terms, other ways to pay."
          error={errors.paymentDetails?.message}
        >
          <Textarea rows={3} {...form.register('paymentDetails')} />
        </Field>
        <fieldset className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-3">
          <legend className="px-1 text-sm font-medium">Invoicing</legend>
          <Field label="Currency" required error={errors.defaultCurrency?.message}>
            <Select {...form.register('defaultCurrency')}>
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </Select>
          </Field>
          <Field label="Number prefix" error={errors.invoicePrefix?.message}>
            <Input className="font-mono" spellCheck={false} {...form.register('invoicePrefix')} />
          </Field>
          <Field label="Next number" required error={errors.nextInvoiceNumber?.message}>
            <Input
              inputMode="numeric"
              className="tabular"
              {...form.register('nextInvoiceNumber')}
            />
          </Field>
          <p className="text-sm text-muted sm:col-span-3" aria-live="polite">
            {preview ? (
              <>
                Next invoice: <span className="font-mono text-fg">{preview}</span>
              </>
            ) : (
              'Next invoice number will appear here.'
            )}
          </p>
        </fieldset>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant="primary" loading={pending}>
          {companyId ? 'Save changes' : 'Add company'}
        </Button>
      </DialogFooter>
    </form>
  )
}
