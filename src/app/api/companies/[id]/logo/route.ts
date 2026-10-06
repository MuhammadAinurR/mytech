import { uuidSchema } from '@/lib/validation'
import { getCurrentUser } from '@/server/auth/session'
import { getCompanyLogo } from '@/server/queries/companies'

/**
 * Serves a company logo to its owner only. Content type comes from the stored,
 * byte-verified type; the response can't be sniffed or run as a document.
 */
export async function GET(_request: Request, { params }: RouteContext<'/api/companies/[id]/logo'>) {
  const user = await getCurrentUser()
  if (!user) return new Response(null, { status: 401 })

  const id = uuidSchema.safeParse((await params).id)
  if (!id.success) return new Response(null, { status: 404 })

  const logo = await getCompanyLogo(user.id, id.data)
  if (!logo) return new Response(null, { status: 404 })

  return new Response(new Uint8Array(logo.data), {
    headers: {
      'Content-Type': logo.mime,
      'Content-Length': String(logo.data.length),
      'Cache-Control': 'private, max-age=300',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
