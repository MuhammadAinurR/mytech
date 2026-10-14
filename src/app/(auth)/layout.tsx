import Link from 'next/link'

import { Logo } from '@/components/logo'

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-(--gutter) pt-[max(1.25rem,env(safe-area-inset-top))] pb-5">
        <Link href="/login" className="inline-flex rounded-sm" aria-label="Workbench home">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-[max(4rem,env(safe-area-inset-bottom))] sm:items-center sm:pt-0 sm:pb-[max(7rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
