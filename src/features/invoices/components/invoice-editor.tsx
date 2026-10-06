'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Select, Textarea } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { addDays, isDateOnly } from '@/lib/dates'
import { applyFieldErrors } from '@/lib/forms'
import { CURRENCIES, formatMoney, parseMoneyInput } from '@/lib/money'
import { cn } from '@/lib/utils'

import { createInvoiceAction, updateInvoiceAction } from '../actions'
import { type CompanyOption, EMPTY_LINE } from '../editor-shared'
import { computeTotals, formatPercent, parsePercent, parseQuantity } from '../lib/totals'
import { invoiceFormSchema, type InvoiceFormValues } from '../schema'

export function InvoiceEditor({
  invoiceId,
  defaultValues,
  companies,
}: {
  invoiceId?: string
  defaultValues: InvoiceFormValues
  companies: CompanyOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
    mode: 'onTouched',
  })
  const { errors } = form.formState
  const lines = useFieldArray({ control: form.control, name: 'items' })
  const [companyId, issueDate] = useWatch({
    control: form.control,
    name: ['companyId', 'issueDate'],
  })
  const selectedCompany = companies.find((company) => company.id === companyId)

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const result = invoiceId
        ? await updateInvoiceAction(invoiceId, values)
        : await createInvoiceAction(values)
      if (result.ok) {
        toast.success(invoiceId ? 'Invoice updated' : 'Invoice saved as draft')
        router.push(`/invoices/${invoiceId ?? (result.data as { id: string }).id}`)
        return
      }
      if (result.error === 'not_editable') {
        toast.error('Only drafts can be edited. Move it back to draft first.')
      } else if (result.error === 'not_found') {
        toast.error('That invoice no longer exists.')
      } else if (result.error === 'number_taken') {
        toast.error('That invoice number is already used. Raise the company’s next number.')
      } else if (!applyFieldErrors(form.setError, result.fieldErrors)) {
        toast.error('The invoice wasn’t saved. Try again.')
      }
    }),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      <Section title="From">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <Field
            label="Company"
            required
            error={errors.companyId?.message}
            hint={
              invoiceId
                ? 'The issuing company is fixed once an invoice is numbered.'
                : selectedCompany
                  ? `This will be ${selectedCompany.nextLabel}.`
                  : undefined
            }
          >
            <Select
              disabled={Boolean(invoiceId)}
              {...form.register('companyId', {
                onChange: (event: { target: { value: string } }) => {
                  const company = companies.find((c) => c.id === event.target.value)
                  if (company) form.setValue('currency', company.defaultCurrency as 'USD')
                },
              })}
            >
              <option value="">Choose a company…</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Currency" required error={errors.currency?.message}>
            <Select {...form.register('currency')}>
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Bill to">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Client name" required error={errors.clientName?.message}>
            <Input autoComplete="off" {...form.register('clientName')} />
          </Field>
          <Field label="Email" error={errors.clientEmail?.message}>
            <Input type="email" autoComplete="off" {...form.register('clientEmail')} />
          </Field>
          <Field label="Address" error={errors.clientAddress?.message}>
            <Textarea rows={3} {...form.register('clientAddress')} />
          </Field>
          <Field label="Tax ID" error={errors.clientTaxId?.message}>
            <Input className="font-mono" {...form.register('clientTaxId')} />
          </Field>
        </div>
      </Section>

      <Section title="Dates">
        <div className="grid gap-5 sm:grid-cols-[12rem_12rem_1fr] sm:items-start">
          <Field label="Issued" required error={errors.issueDate?.message}>
            <Input type="date" {...form.register('issueDate')} />
          </Field>
          <Field label="Due" required error={errors.dueDate?.message}>
            <Input type="date" {...form.register('dueDate')} />
          </Field>
          <div className="flex flex-wrap items-center gap-1 sm:pt-6">
            {[7, 14, 30].map((days) => (
              <Button
                key={days}
                size="sm"
                variant="ghost"
                disabled={!isDateOnly(issueDate)}
                onClick={() =>
                  form.setValue('dueDate', addDays(issueDate, days), { shouldValidate: true })
                }
              >
                Net {days}
              </Button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Items">
        <div className="flex flex-col gap-3">
          <div
            aria-hidden
            className="hidden grid-cols-[minmax(0,1fr)_5rem_8rem_8rem_2rem] gap-3 text-xs font-medium text-muted md:grid"
          >
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {lines.fields.map((line, index) => {
            const lineErrors = errors.items?.[index]
            return (
              <div
                key={line.id}
                className="grid grid-cols-[minmax(0,1fr)_2rem] gap-x-3 gap-y-2 border-b border-border pb-3 md:grid-cols-[minmax(0,1fr)_5rem_8rem_8rem_2rem] md:border-0 md:pb-0"
              >
                <div className="md:col-span-1">
                  <Field
                    label={`Line ${index + 1} description`}
                    hideLabel
                    required
                    error={lineErrors?.description?.message}
                  >
                    <Input
                      placeholder="What you delivered"
                      {...form.register(`items.${index}.description`)}
                    />
                  </Field>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="mt-0.5 md:order-last"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={lines.fields.length === 1}
                  onClick={() => lines.remove(index)}
                >
                  <X />
                </Button>
                <div className="col-span-2 grid grid-cols-3 gap-3 md:col-span-3 md:grid-cols-[5rem_8rem_8rem]">
                  <Field
                    label={`Line ${index + 1} quantity`}
                    hideLabel
                    required
                    error={lineErrors?.quantity?.message}
                  >
                    <Input
                      inputMode="decimal"
                      className="text-right tabular"
                      {...form.register(`items.${index}.quantity`)}
                    />
                  </Field>
                  <Field
                    label={`Line ${index + 1} unit price`}
                    hideLabel
                    required
                    error={lineErrors?.unitPrice?.message}
                  >
                    <Input
                      inputMode="decimal"
                      placeholder="0.00"
                      className="text-right tabular"
                      {...form.register(`items.${index}.unitPrice`)}
                    />
                  </Field>
                  <LineAmount control={form.control} index={index} />
                </div>
              </div>
            )
          })}
          <div>
            <Button size="sm" variant="ghost" onClick={() => lines.append(EMPTY_LINE)}>
              <Plus />
              Add line
            </Button>
          </div>
          {errors.items?.root?.message || errors.items?.message ? (
            <p className="text-xs text-danger" role="alert">
              {errors.items?.root?.message ?? errors.items?.message}
            </p>
          ) : null}
        </div>
      </Section>

      <Section title="Totals">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid content-start gap-5 sm:grid-cols-2">
            <Field
              label="Tax rate"
              hint="Percent, applied after the discount."
              error={errors.taxRate?.message}
            >
              <div className="relative">
                <Input
                  inputMode="decimal"
                  placeholder="0"
                  className="pr-8 tabular"
                  {...form.register('taxRate')}
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-subtle">
                  %
                </span>
              </div>
            </Field>
            <Field
              label="Discount"
              hint="A fixed amount off the subtotal."
              error={errors.discount?.message}
            >
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className="tabular"
                {...form.register('discount')}
              />
            </Field>
            <Field
              label="Notes"
              className="sm:col-span-2"
              hint="Shown on the invoice, e.g. terms or a thank-you."
              error={errors.notes?.message}
            >
              <Textarea rows={3} {...form.register('notes')} />
            </Field>
          </div>
          <LiveTotals control={form.control} />
        </div>
      </Section>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface px-(--gutter) py-3">
        <Button asChild variant="secondary">
          <Link href={invoiceId ? `/invoices/${invoiceId}` : '/invoices'}>Cancel</Link>
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          {invoiceId ? 'Save changes' : 'Save draft'}
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-border px-(--gutter) py-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-8">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div>{children}</div>
    </section>
  )
}

function LineAmount({ control, index }: { control: Control<InvoiceFormValues>; index: number }) {
  const [quantity, unitPrice, currency] = useWatch({
    control,
    name: [`items.${index}.quantity`, `items.${index}.unitPrice`, 'currency'],
  })
  const quantityMilli = parseQuantity(quantity ?? '')
  const unitPriceMinor = parseMoneyInput(unitPrice ?? '', currency)
  const amount =
    quantityMilli !== null && unitPriceMinor !== null
      ? computeTotals({
          lines: [{ quantityMilli, unitPriceMinor }],
          taxRateBps: 0,
          discountMinor: 0,
        }).subtotalMinor
      : null
  return (
    <p
      className="flex h-8 items-center justify-end tabular text-sm"
      aria-label={`Line ${index + 1} amount`}
    >
      {amount === null ? <span className="text-subtle">—</span> : formatMoney(amount, currency)}
    </p>
  )
}

/** The same integer math the server uses, so what you see is what is saved. */
function LiveTotals({ control }: { control: Control<InvoiceFormValues> }) {
  const [items, currency, taxRate, discount] = useWatch({
    control,
    name: ['items', 'currency', 'taxRate', 'discount'],
  })
  const lines = (items ?? []).flatMap((item) => {
    const quantityMilli = parseQuantity(item.quantity ?? '')
    const unitPriceMinor = parseMoneyInput(item.unitPrice ?? '', currency)
    return quantityMilli !== null && unitPriceMinor !== null
      ? [{ quantityMilli, unitPriceMinor }]
      : []
  })
  const taxRateBps = parsePercent(taxRate || '0') ?? 0
  const totals = computeTotals({
    lines,
    taxRateBps,
    discountMinor: parseMoneyInput(discount || '0', currency) ?? 0,
  })
  const money = (amount: number) => formatMoney(amount, currency)

  return (
    <dl className="self-start rounded-md border border-border p-4 text-sm" aria-live="polite">
      <TotalRow label="Subtotal" value={money(totals.subtotalMinor)} />
      <TotalRow
        label="Discount"
        value={totals.discountMinor > 0 ? `−${money(totals.discountMinor)}` : money(0)}
        muted={totals.discountMinor === 0}
      />
      <TotalRow
        label={`Tax (${formatPercent(taxRateBps)}%)`}
        value={money(totals.taxMinor)}
        muted={totals.taxMinor === 0}
      />
      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
        <dt className="font-medium">Total</dt>
        <dd className="tabular text-lg font-semibold">{money(totals.totalMinor)}</dd>
      </div>
    </dl>
  )
}

function TotalRow({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('tabular', muted && 'text-subtle')}>{value}</dd>
    </div>
  )
}
