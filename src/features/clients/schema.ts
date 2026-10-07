import { z } from 'zod'

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use ${max.toLocaleString('en-US')} characters or fewer.`)

/** A saved client's form values. Same limits as an invoice's "Bill to" fields. */
export const clientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter the client’s name.')
    .max(160, 'Use 160 characters or fewer.'),
  address: optional(1000),
  email: z
    .string()
    .trim()
    .max(254)
    .refine(
      (value) => value === '' || z.email().safeParse(value).success,
      'Enter a valid email address.',
    ),
  taxId: optional(64),
})

export type ClientFormValues = z.input<typeof clientFormSchema>

export const clientInputSchema = clientFormSchema.transform((value) => ({
  name: value.name,
  address: value.address || null,
  email: value.email || null,
  taxId: value.taxId || null,
}))

export type ClientInput = z.output<typeof clientInputSchema>

export const CLIENT_NAME_TAKEN = 'This company already has a client with this name.'
