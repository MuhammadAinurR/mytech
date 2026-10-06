import { requireUser } from '@/server/auth/session'

// Placeholder shell; replaced by the full app shell (sidebar, command palette).
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  await requireUser()
  return <div className="min-h-dvh bg-surface">{children}</div>
}
