'use client'

import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export function PrintToolbar({ backHref, autoPrint }: { backHref: string; autoPrint: boolean }) {
  useEffect(() => {
    if (autoPrint) window.print()
  }, [autoPrint])

  return (
    <div className="no-print mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-0">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        Back to invoice
      </Link>
      <Button variant="primary" onClick={() => window.print()}>
        <Printer />
        Print
      </Button>
    </div>
  )
}
