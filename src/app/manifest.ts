import type { MetadataRoute } from 'next'

/** Installs Workbench as a standalone app (home screen on iOS and Android, desktop PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Workbench',
    short_name: 'Workbench',
    description: 'Money, renewals, credentials, invoices, and projects in one place.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // The app canvas (globals.css --background); the theme color follows the
    // color scheme through the viewport meta tags instead.
    background_color: '#f6f7f8',
    theme_color: '#f6f7f8',
    categories: ['finance', 'productivity', 'business'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
