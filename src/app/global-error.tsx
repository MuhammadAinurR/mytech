'use client'

import './globals.css'

/** Last-resort boundary when the root layout itself fails. Keeps styling minimal. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-md font-semibold">Workbench couldn’t load</h1>
          <p className="max-w-sm text-sm text-muted">
            Something went wrong on our side. Your data is safe. Try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            className="h-8 cursor-pointer rounded-sm border border-border-strong bg-surface px-3 text-sm font-medium"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
