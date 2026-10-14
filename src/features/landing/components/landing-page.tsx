import {
  ArrowLeftRight,
  BellRing,
  FileText,
  KeyRound,
  Smartphone,
  SquareKanban,
} from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

import { Logo, LogoMark } from '@/components/logo'
import { Button } from '@/components/ui/button'

import { AppPreview } from './app-preview'

/**
 * The public page at `/`. Signed-in visits never see it (the route redirects
 * to the dashboard), so it speaks to someone deciding whether to sign up.
 */
export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-fg">
      <header className="pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex rounded-sm" aria-label="Workbench">
            <Logo />
          </Link>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/signup">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
          <h1 className="mx-auto max-w-2xl text-xl font-semibold tracking-[-0.02em] text-balance sm:text-2xl sm:tracking-[-0.025em]">
            Money, invoices, and projects in one place.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-md text-pretty text-muted">
            Workbench is the admin side of independent work: track what comes in and goes out, send
            invoices that number themselves, and get reminded before anything falls due.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/signup">Create your account</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <div className="mx-auto mt-16 max-w-3xl sm:mt-20">
            <AppPreview />
          </div>
        </section>

        <section
          aria-labelledby="features-heading"
          className="border-t border-border bg-surface py-16 sm:py-20"
        >
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <h2 id="features-heading" className="text-lg font-semibold tracking-[-0.01em]">
              Everything the admin side needs
            </h2>
            <p className="mt-2 max-w-xl text-base text-muted">
              The five things you juggle after the real work is done, kept next to each other
              instead of in five tabs.
            </p>
            <div className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              <Feature icon={<ArrowLeftRight />} title="Income and expense, month by month">
                Every currency you use, side by side. Recurring rules post rent and retainers on
                their dates, and renewals warn you before they bill.
              </Feature>
              <Feature icon={<FileText />} title="Invoices that number themselves">
                Each company keeps its own sequence. Saved clients fill in their details, totals use
                integer math, and the PDF prints the same everywhere.
              </Feature>
              <Feature icon={<BellRing />} title="Reminders ahead of the due date">
                Push notifications three days ahead, on the day, and the day after — at 9:00 in your
                timezone, only while the invoice is still unpaid.
              </Feature>
              <Feature icon={<SquareKanban />} title="Projects beside the money">
                A board you can drag, a calendar for the dates, and days-left on every ongoing card
                so nothing quietly runs over.
              </Feature>
              <Feature icon={<KeyRound />} title="Credentials, encrypted">
                Server logins and domain accounts, AES-256-GCM encrypted with versioned keys. Every
                reveal and copy is logged.
              </Feature>
              <Feature icon={<Smartphone />} title="An app when you want one">
                Install it from the browser: a tab bar, bottom sheets, push, and an offline shell.
                The desktop stays a desktop.
              </Feature>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 text-center sm:py-20">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <h2 className="text-lg font-semibold tracking-[-0.01em]">
              Start with one company and one invoice.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-base text-muted">
              Your data is scoped to your account at every query, and secrets are encrypted before
              they are stored.
            </p>
            <div className="mt-6">
              <Button asChild variant="primary" size="lg">
                <Link href="/signup">Create your account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-8 sm:px-6">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-muted">
            <LogoMark className="size-4" />
            Workbench
          </span>
          <span className="text-sm text-subtle">© 2026</span>
        </div>
      </footer>
    </div>
  )
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span aria-hidden className="text-muted [&_svg]:size-5">
        {icon}
      </span>
      <h3 className="text-md font-medium">{title}</h3>
      <p className="text-base leading-relaxed text-muted">{children}</p>
    </div>
  )
}
