import { z } from 'zod'

import { isDateOnly } from '@/lib/dates'
import { CURRENCIES, parseMoneyInput } from '@/lib/money'
import { firstParam, pageParamSchema, uuidSchema } from '@/lib/validation'

import { computeTotals, parsePercent, parseQuantity } from './lib/totals'

export const INVOICE_STATUSES = ['draft', 'sent', 'paid'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
}

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max.toLocaleString('en-US')} characters or fewer.`)

export const invoiceItemFormSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, 'Describe this line.')
    .max(500, 'Use 500 characters or fewer.'),
  quantity: z.string().trim(),
  unitPrice: z.string().trim(),
})

/** The invoice editor's values (strings as typed). Shared by browser and server. */
export const invoiceFormSchema = z
  .object({
    companyId: uuidSchema.or(z.literal('')),
    issueDate: z.string().trim(),
    dueDate: z.string().trim(),
    currency: z.enum(CURRENCIES, 'Choose a currency.'),
    clientName: z.string().trim().min(1, 'Enter who this invoice is for.').max(160),
    clientAddress: text(1000),
    clientEmail: z
      .string()
      .trim()
      .max(254)
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address.'),
    clientTaxId: text(64),
    notes: text(2000),
    taxRate: z.string().trim(),
    discount: z.string().trim(),
    items: z
      .array(invoiceItemFormSchema)
      .min(1, 'Add at least one line.')
      .max(200, 'Use 200 lines or fewer.'),
    /** Also add the "Bill to" details to the company's saved clients. */
    saveClient: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message })

    if (value.companyId === '') issue(['companyId'], 'Choose the company issuing this invoice.')
    if (!isDateOnly(value.issueDate)) issue(['issueDate'], 'Enter a valid date.')
    if (!isDateOnly(value.dueDate)) issue(['dueDate'], 'Enter a valid date.')
    else if (isDateOnly(value.issueDate) && value.dueDate < value.issueDate) {
      issue(['dueDate'], 'Due on or after the issue date.')
    }
    if (value.taxRate !== '' && parsePercent(value.taxRate) === null) {
      issue(['taxRate'], 'Use a rate from 0 to 100, like 11 or 7.5.')
    }

    const lines: { quantityMilli: number; unitPriceMinor: number }[] = []
    value.items.forEach((item, index) => {
      const quantityMilli = parseQuantity(item.quantity)
      const unitPriceMinor = parseMoneyInput(item.unitPrice, value.currency)
      if (quantityMilli === null)
        issue(['items', index, 'quantity'], 'Use a quantity like 1 or 2.5.')
      if (unitPriceMinor === null)
        issue(['items', index, 'unitPrice'], 'Enter a price like 1250 or 1,250.00.')
      if (quantityMilli !== null && unitPriceMinor !== null)
        lines.push({ quantityMilli, unitPriceMinor })
    })

    if (value.discount !== '') {
      const discountMinor = parseMoneyInput(value.discount, value.currency)
      if (discountMinor === null) issue(['discount'], 'Enter an amount like 50 or 50.00.')
      else if (lines.length === value.items.length) {
        const { subtotalMinor } = computeTotals({ lines, taxRateBps: 0, discountMinor: 0 })
        if (discountMinor > subtotalMinor)
          issue(['discount'], 'The discount can’t exceed the subtotal.')
      }
    }
  })

export type InvoiceFormValues = z.input<typeof invoiceFormSchema>

/** Server-side: editor values → the stored invoice (totals are computed in the DAL). */
export const invoiceInputSchema = invoiceFormSchema.transform((value) => ({
  companyId: value.companyId,
  issueDate: value.issueDate,
  dueDate: value.dueDate,
  currency: value.currency,
  clientName: value.clientName,
  clientAddress: value.clientAddress || null,
  clientEmail: value.clientEmail || null,
  clientTaxId: value.clientTaxId || null,
  notes: value.notes || null,
  taxRateBps: value.taxRate === '' ? 0 : parsePercent(value.taxRate)!,
  discountMinor: value.discount === '' ? 0 : parseMoneyInput(value.discount, value.currency)!,
  items: value.items.map((item) => ({
    description: item.description,
    quantityMilli: parseQuantity(item.quantity)!,
    unitPriceMinor: parseMoneyInput(item.unitPrice, value.currency)!,
  })),
  saveClient: value.saveClient,
}))

export type InvoiceInput = z.output<typeof invoiceInputSchema>
/** What gets stored: the input without editor-only options. */
export type InvoiceFields = Omit<InvoiceInput, 'saveClient'>

export const invoiceListQuerySchema = z.object({
  status: z.preprocess(firstParam, z.enum(INVOICE_STATUSES).optional()).catch(undefined),
  q: z.preprocess(firstParam, z.string().trim().max(100).optional()).catch(undefined),
  page: z.preprocess(firstParam, pageParamSchema),
})

export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>
