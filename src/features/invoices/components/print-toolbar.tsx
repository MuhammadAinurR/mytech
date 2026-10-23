'use client'

import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export function PrintToolbar({
  backHref,
  autoPrint,
  attachmentCount = 0,
  pdfHref,
}: {
  backHref: string
  autoPrint: boolean
  /** Attached PDFs can't be printed from this page; the PDF download has them. */
  attachmentCount?: number
  pdfHref: string
}) {
  useEffect(() => {
    if (autoPrint) window.print()
  }, [autoPrint])

  return (
    <div className="no-print mx-auto max-w-3xl px-4 py-4 sm:px-0">
      <div className="flex items-center justify-between">
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
      {attachmentCount > 0 ? (
        <p className="pt-3 text-sm text-muted">
          This prints the invoice only. Its {attachmentCount}{' '}
          {attachmentCount === 1 ? 'attachment is' : 'attachments are'} in the{' '}
          <a href={pdfHref} download className="text-fg underline underline-offset-2">
            PDF download
          </a>
          .
        </p>
      ) : null}
    </div>
  )
}
