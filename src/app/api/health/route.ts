import { checkHealth } from '@/server/health'

/** Readiness probe: 200 when Postgres and Redis respond, 503 otherwise. */
export async function GET() {
  const health = await checkHealth()
  return Response.json(health, {
    status: health.status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}
