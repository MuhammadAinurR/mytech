'use server'

import { revalidatePath } from 'next/cache'

import { err, ok, type Result } from '@/lib/result'
import { fieldErrors, uuidSchema } from '@/lib/validation'
import { requireUser } from '@/server/auth/session'
import { detectImageType } from '@/server/images'
import {
  createCompany,
  deleteCompany,
  setCompanyLogo,
  updateCompany,
} from '@/server/queries/companies'

import { companyInputSchema, LOGO_MAX_BYTES } from './schema'

function refresh() {
  revalidatePath('/companies')
  revalidatePath('/invoices', 'layout')
}

export async function createCompanyAction(
  input: unknown,
): Promise<Result<{ id: string }, 'invalid'>> {
  const user = await requireUser()
  const parsed = companyInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))
  const company = await createCompany(user.id, parsed.data)
  refresh()
  return ok({ id: company.id })
}

export async function updateCompanyAction(
  id: unknown,
  input: unknown,
): Promise<Result<undefined, 'invalid' | 'not_found'>> {
  const user = await requireUser()
  const companyId = uuidSchema.safeParse(id)
  if (!companyId.success) return err('not_found')
  const parsed = companyInputSchema.safeParse(input)
  if (!parsed.success) return err('invalid', fieldErrors(parsed.error))
  if (!(await updateCompany(user.id, companyId.data, parsed.data))) return err('not_found')
  refresh()
  return ok()
}

export async function deleteCompanyAction(
  id: unknown,
): Promise<Result<undefined, 'not_found' | 'has_invoices'>> {
  const user = await requireUser()
  const companyId = uuidSchema.safeParse(id)
  if (!companyId.success) return err('not_found')
  const result = await deleteCompany(user.id, companyId.data)
  if (result.ok) refresh()
  return result
}

/** Accepts PNG, JPEG, or WebP up to 512 KB, identified by content, not by name. */
export async function uploadCompanyLogoAction(
  id: unknown,
  formData: FormData,
): Promise<Result<undefined, 'not_found' | 'invalid_file' | 'too_large'>> {
  const user = await requireUser()
  const companyId = uuidSchema.safeParse(id)
  if (!companyId.success) return err('not_found')

  const file = formData.get('logo')
  if (!(file instanceof File) || file.size === 0) return err('invalid_file')
  if (file.size > LOGO_MAX_BYTES) return err('too_large')
  const data = Buffer.from(await file.arrayBuffer())
  const mime = detectImageType(data)
  if (!mime) return err('invalid_file')

  if (!(await setCompanyLogo(user.id, companyId.data, { data, mime }))) return err('not_found')
  refresh()
  return ok()
}

export async function removeCompanyLogoAction(
  id: unknown,
): Promise<Result<undefined, 'not_found'>> {
  const user = await requireUser()
  const companyId = uuidSchema.safeParse(id)
  if (!companyId.success) return err('not_found')
  if (!(await setCompanyLogo(user.id, companyId.data, null))) return err('not_found')
  refresh()
  return ok()
}
