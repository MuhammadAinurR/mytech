import { revalidatePath } from 'next/cache'

import {
  type AttachmentUploadError,
  cleanAttachmentName,
  MAX_ATTACHMENT_BYTES,
} from '@/features/invoices/lib/attachments'
import { inspectPdf } from '@/features/invoices/pdf/attachments'
import { uuidSchema } from '@/lib/validation'
import { getCurrentUser } from '@/server/auth/session'
import { addInvoiceAttachment } from '@/server/queries/invoice-attachments'
import { RATE_LIMITS, rateLimit } from '@/server/rate-limit'
import { isSameOrigin } from '@/server/same-origin'

const fail = (error: AttachmentUploadError, status: number, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers })

/** Room for the multipart boundary and headers around a file at the size limit. */
const MAX_REQUEST_BYTES = MAX_ATTACHMENT_BYTES + 64 * 1024

/**
 * Attaches one PDF (form field `file`) to the owner's invoice. Everything cheap
 * is checked before the body is read: session, origin, invoice id, declared
 * size, rate limit. The file is then identified by its bytes, never by its
 * name or the browser's type.
 */
export async function POST(
  request: Request,
  { params }: RouteContext<'/api/invoices/[id]/attachments'>,
) {
  const user = await getCurrentUser()
  if (!user) return fail('unauthorized', 401)
  if (!isSameOrigin(request)) return fail('forbidden', 403)

  const invoiceId = uuidSchema.safeParse((await params).id)
  if (!invoiceId.success) return fail('not_found', 404)

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_REQUEST_BYTES) return fail('file_too_large', 413)

  const limit = await rateLimit(RATE_LIMITS.attachmentUpload, user.id)
  if (!limit.allowed) {
    return fail('rate_limited', 429, { 'Retry-After': String(limit.retryAfterSeconds) })
  }

  let file: FormDataEntryValue | null
  try {
    file = (await request.formData()).get('file')
  } catch {
    return fail('invalid', 400)
  }
  if (!(file instanceof File) || file.size === 0) return fail('invalid', 400)
  if (file.size > MAX_ATTACHMENT_BYTES) return fail('file_too_large', 413)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const check = await inspectPdf(bytes)
  if (!check.ok) return fail(check.reason, 400)

  const result = await addInvoiceAttachment(user.id, invoiceId.data, {
    fileName: cleanAttachmentName(file.name),
    bytes,
    pageCount: check.pageCount,
  })
  if (!result.ok) {
    const status = { not_found: 404, too_many: 409, too_large: 413 }[result.error]
    return fail(result.error, status)
  }

  revalidatePath(`/invoices/${invoiceId.data}`)
  return Response.json({ attachment: result.data }, { status: 201 })
}
