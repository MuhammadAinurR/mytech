import { contentDisposition } from '@/features/invoices/lib/attachments'
import { uuidSchema } from '@/lib/validation'
import { getCurrentUser } from '@/server/auth/session'
import { readInvoiceAttachmentFile } from '@/server/queries/invoice-attachments'

/**
 * Downloads one attached PDF, for its owner only. It's sent as a download, not
 * shown inline: the file came from a third party, and rendering it on the
 * app's own origin would let any script inside it run there.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/api/invoices/[id]/attachments/[attachmentId]'>,
) {
  const user = await getCurrentUser()
  if (!user) return new Response(null, { status: 401 })

  const { id, attachmentId } = await params
  const invoiceId = uuidSchema.safeParse(id)
  const attachment = uuidSchema.safeParse(attachmentId)
  if (!invoiceId.success || !attachment.success) return new Response(null, { status: 404 })

  const file = await readInvoiceAttachmentFile(user.id, invoiceId.data, attachment.data)
  if (!file) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': contentDisposition('attachment', file.fileName),
      'Content-Length': String(file.bytes.byteLength),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
