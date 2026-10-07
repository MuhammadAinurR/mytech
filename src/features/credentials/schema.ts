import { z } from 'zod'

import { firstParam, pageParamSchema } from '@/lib/validation'

export const CREDENTIAL_TYPES = ['server', 'domain', 'other'] as const
export type CredentialType = (typeof CREDENTIAL_TYPES)[number]

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  server: 'Server',
  domain: 'Domain',
  other: 'Other',
}

const optionalText = (max: number, message: string) => z.string().trim().max(max, message)

const credentialFields = {
  label: z.string().trim().min(1, 'Name this credential.').max(120, 'Use 120 characters or fewer.'),
  type: z.enum(CREDENTIAL_TYPES, 'Choose a type.'),
  host: optionalText(255, 'Use 255 characters or fewer.'),
  username: optionalText(255, 'Use 255 characters or fewer.'),
  notes: optionalText(2000, 'Use 2,000 characters or fewer.'),
}

const secret = z.string().max(4096, 'Use 4,096 characters or fewer.')

/** Creating requires a secret. */
export const credentialCreateSchema = z.object({
  ...credentialFields,
  secret: secret.min(1, 'Enter the secret.'),
})

/** Editing: an empty secret keeps the stored one. */
export const credentialUpdateSchema = z.object({ ...credentialFields, secret })

export type CredentialFormValues = z.input<typeof credentialUpdateSchema>

const blankToNull = (value: string) => (value === '' ? null : value)

export function toCredentialInput(values: z.output<typeof credentialUpdateSchema>) {
  return {
    label: values.label,
    type: values.type,
    host: blankToNull(values.host),
    username: blankToNull(values.username),
    notes: blankToNull(values.notes),
    secret: blankToNull(values.secret),
  }
}

export type CredentialInput = ReturnType<typeof toCredentialInput>

export const credentialListQuerySchema = z.object({
  q: z.preprocess(firstParam, z.string().trim().max(100).optional()).catch(undefined),
  type: z.preprocess(firstParam, z.enum(CREDENTIAL_TYPES).optional()).catch(undefined),
  page: z.preprocess(firstParam, pageParamSchema),
})

export type CredentialListQuery = z.infer<typeof credentialListQuerySchema>

export const revealPurposeSchema = z.enum(['reveal', 'copy'])
