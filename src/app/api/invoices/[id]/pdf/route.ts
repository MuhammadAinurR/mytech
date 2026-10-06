import { pdfFilename, renderInvoicePdf } from '@/features/invoices/pdf/invoice-pdf'
import { uuidSchema } from '@/lib/validation'
import { getCurrentUser } from '@/server/auth/session'
import { logger } from '@/server/logger'
import { getCompanyLogo } from '@/server/queries/companies'
import { getInvoice } from '@/server/queries/invoices'

/** Renders an invoice PDF on the server, for its owner only. */
export async function GET(_request: Request, { params }: RouteContext<'/api/invoices/[id]/pdf'>) {
  const user = await getCurrentUser()
  if (!user) return new Response(null, { status: 401 })

  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) return new Response(null, { status: 404 })

  const invoice = await getInvoice(user.id, id.data)
  if (!invoice) return new Response(null, { status: 404 })

  try {
    const logo = invoice.company.hasLogo ? await getCompanyLogo(user.id, invoice.company.id) : null
    const pdf = await renderInvoicePdf(invoice, logo)
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdfFilename(invoice.numberLabel)}"`,
        'Content-Length': String(pdf.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    logger.error({ err: error, invoiceId: invoice.id }, 'invoice PDF failed to render')
    return new Response('The PDF could not be generated.', { status: 500 })
  }
}
