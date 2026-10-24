import { z } from 'zod'

import { CURRENCIES } from '@/lib/money'

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max.toLocaleString('en-US')} characters or fewer.`)

/** Same rule as the database: 4–40 letters and digits, single spaces or dashes between groups. */
const BANK_ACCOUNT_NUMBER = /^[A-Za-z0-9]+([ -][A-Za-z0-9]+)*$/

export const companyFormSchema = z
  .object({
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
    // Defaults let a form from before these fields existed still save.
    bankName: optional(100).default(''),
    bankAccountName: optional(160).default(''),
    bankAccountNumber: z
      .string()
      .default('')
      .transform((value) => value.trim().replace(/\s+/g, ' '))
      .refine(
        (value) =>
          value === '' ||
          (value.length >= 4 && value.length <= 40 && BANK_ACCOUNT_NUMBER.test(value)),
        'Use 4–40 letters or numbers, with spaces or dashes between groups.',
      ),
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
  .superRefine((value, ctx) => {
    // Bank, account number, and account name go together, on the invoice and
    // in the database: name each one that's missing once any is filled in.
    const fields = [
      ['bankName', 'bank'],
      ['bankAccountNumber', 'account number'],
      ['bankAccountName', 'account name'],
    ] as const
    if (!fields.some(([key]) => value[key])) return
    for (const [key, label] of fields) {
      if (!value[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `Add the ${label} too, or clear the bank details.`,
        })
      }
    }
  })

export type CompanyFormValues = z.input<typeof companyFormSchema>

export const companyInputSchema = companyFormSchema.transform((value) => ({
  name: value.name,
  address: value.address || null,
  taxId: value.taxId || null,
  email: value.email || null,
  defaultCurrency: value.defaultCurrency,
  paymentDetails: value.paymentDetails || null,
  bankName: value.bankName || null,
  bankAccountNumber: value.bankAccountNumber || null,
  bankAccountName: value.bankAccountName || null,
  invoicePrefix: value.invoicePrefix,
  nextInvoiceNumber: Number(value.nextInvoiceNumber),
}))

export type CompanyInput = z.output<typeof companyInputSchema>

export const LOGO_MAX_BYTES = 512 * 1024
