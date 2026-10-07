import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'

import { ServiceWorker } from '@/components/pwa/service-worker'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Workbench', template: '%s · Workbench' },
  description: 'Personal and business operations in one place.',
  applicationName: 'Workbench',
  // Installed from Safari's share sheet, the app opens standalone with this
  // name and icon. The manifest (app/manifest.ts) covers other browsers.
  appleWebApp: { capable: true, title: 'Workbench', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-touch-icon.png' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'oklch(0.975 0.002 260)' },
    { media: '(prefers-color-scheme: dark)', color: 'oklch(0.155 0.004 260)' },
  ],
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // Reading the request makes every route dynamic, which the per-request CSP
  // nonce requires (see ADR 0001). next-themes needs the nonce for its script.
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en" suppressHydrationWarning className={cn(GeistSans.variable, GeistMono.variable)}>
      <body>
        <ThemeProvider nonce={nonce}>
          <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  )
}
