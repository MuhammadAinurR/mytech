import { z } from 'zod'

import { CURRENCIES, parseMoneyInput } from '@/lib/money'
import { dateOnlySchema, firstParam, monthSchema, pageParamSchema } from '@/lib/validation'

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

/**
 * What the form edits: amounts as the user typed them. The same schema runs in
 * the browser (inline validation) and on the server (authoritative).
 */
export const transactionFormSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES, 'Choose income or expense.'),
    amount: z.string().trim().min(1, 'Enter an amount.').max(32),
    currency: z.enum(CURRENCIES, 'Choose a currency.'),
    category: z.string().trim().min(1, 'Enter a category.').max(64, 'Use 64 characters or fewer.'),
    occurredOn: dateOnlySchema,
    note: z.string().trim().max(1000, 'Use 1,000 characters or fewer.'),
  })
  .superRefine((value, ctx) => {
    const minor = parseMoneyInput(value.amount, value.currency)
    if (minor === null || minor <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['amount'],
        message:
          minor === 0
            ? 'Enter an amount greater than zero.'
            : 'Enter an amount like 1250 or 1,250.00.',
      })
    }
  })

export type TransactionFormValues = z.input<typeof transactionFormSchema>

/** Server-side: form values → the shape stored in the database. */
export const transactionInputSchema = transactionFormSchema.transform((value) => ({
  type: value.type,
  amountMinor: parseMoneyInput(value.amount, value.currency)!,
  currency: value.currency,
  category: value.category,
  occurredOn: value.occurredOn,
  note: value.note === '' ? null : value.note,
}))

export type TransactionInput = z.output<typeof transactionInputSchema>

export const transactionListQuerySchema = z.object({
  month: z.preprocess(firstParam, monthSchema.optional()).catch(undefined),
  type: z.preprocess(firstParam, z.enum(TRANSACTION_TYPES).optional()).catch(undefined),
  q: z.preprocess(firstParam, z.string().trim().max(100).optional()).catch(undefined),
  page: z.preprocess(firstParam, pageParamSchema),
})

export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>
