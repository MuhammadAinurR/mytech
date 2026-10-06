// Liveness probe. Dependency checks (Postgres, Redis) are added with the
// server infrastructure.
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } })
}
