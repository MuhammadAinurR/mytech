import { requireUser } from '@/server/auth/session'

/** Bare layout for printable documents: no app chrome, paper background. */
export default async function PrintLayout({ children }: LayoutProps<'/'>) {
  await requireUser()
  return <div className="min-h-dvh bg-background print:bg-paper">{children}</div>
}
