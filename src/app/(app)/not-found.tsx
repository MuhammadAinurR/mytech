import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export default function AppNotFound() {
  return (
    <EmptyState
      className="min-h-[60vh]"
      title="This page doesn’t exist"
      description="It may have been deleted, or the link is wrong."
      action={
        <Button asChild size="sm">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      }
    />
  )
}
