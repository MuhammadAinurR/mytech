'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Details stay in the server log (by digest); the console gets a pointer only.
    console.error('Page failed to render', error.digest ?? '')
  }, [error])

  return (
    <ErrorState
      className="min-h-[60vh]"
      action={
        <Button onClick={reset} size="sm">
          Try again
        </Button>
      }
    />
  )
}
