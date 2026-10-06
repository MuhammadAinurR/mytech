import Link from 'next/link'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="px-(--gutter) py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center">
        <EmptyState
          title="This page doesn’t exist"
          description="It may have been deleted, or the link is wrong."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          }
        />
      </main>
    </div>
  )
}
