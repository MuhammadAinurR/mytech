import type { Metadata } from 'next'
import { headers } from 'next/headers'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Workbench', template: '%s · Workbench' },
  description: 'Personal and business operations in one place.',
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Reading the request makes every route dynamic, which the per-request CSP
  // nonce requires (see ADR 0001).
  await headers()

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
