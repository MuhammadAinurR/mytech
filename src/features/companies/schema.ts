import { z } from 'zod'

import { CURRENCIES } from '@/lib/money'

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max.toLocaleString('en-US')} characters or fewer.`)

export const companyFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter the company name.')
    .max(160, 'Use 160 characters or fewer.'),
  address: optional(1000),
  taxId: optional(64),
  email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) => value === '' || z.email().safeParse(value).success,
      'Enter a valid email address.',
    ),
  defaultCurrency: z.enum(CURRENCIES, 'Choose a currency.'),
  paymentDetails: optional(1000),
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9/_-]{0,12}$/, 'Use up to 12 letters, numbers, or - / _.'),
  nextInvoiceNumber: z
    .string()
    .trim()
    .regex(/^\d{1,9}$/, 'Enter a whole number.')
    .refine((value) => Number(value) >= 1, 'Start at 1 or higher.'),
})

export type CompanyFormValues = z.input<typeof companyFormSchema>

export const companyInputSchema = companyFormSchema.transform((value) => ({
  name: value.name,
  address: value.address || null,
  taxId: value.taxId || null,
  email: value.email || null,
  defaultCurrency: value.defaultCurrency,
  paymentDetails: value.paymentDetails || null,
  invoicePrefix: value.invoicePrefix,
  nextInvoiceNumber: Number(value.nextInvoiceNumber),
}))

export type CompanyInput = z.output<typeof companyInputSchema>

export const LOGO_MAX_BYTES = 512 * 1024
