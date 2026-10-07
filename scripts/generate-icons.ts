/**
 * Renders the PWA icons in public/icons from the Workbench mark (a bench top
 * over a shelf, see src/components/logo.tsx). Run after changing the mark:
 *
 *   npm run icons:generate
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const OUT = path.join(process.cwd(), 'public', 'icons')

// Hex equivalents of the ink and paper tokens (globals.css), which are OKLCH.
const INK_TOP = '#24272b'
const INK_BOTTOM = '#141618'
const PAPER = '#f6f7f8'

/** The two bars on a 20-unit grid, as in LogoMark. */
function bars(fill: string) {
  return `
    <rect x="4.5" y="6" width="11" height="2.5" rx="1" fill="${fill}" />
    <rect x="6.5" y="11.5" width="7" height="2.5" rx="1" fill="${fill}" />`
}

/**
 * The app icon. `radius` rounds the canvas for "any" icons; maskable and Apple
 * icons are full-bleed because the platform applies its own mask. The bars stay
 * inside the maskable safe zone (the central 80% circle).
 */
function appIcon(radius: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="1024" height="1024">
    <defs>
      <linearGradient id="ink" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${INK_TOP}" />
        <stop offset="1" stop-color="${INK_BOTTOM}" />
      </linearGradient>
    </defs>
    <rect width="20" height="20" rx="${radius}" fill="url(#ink)" />
    ${bars(PAPER)}
  </svg>`
}

/** Monochrome silhouette for the Android status bar; only alpha is used. */
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="3 3 14 14" width="1024" height="1024">
  ${bars('#ffffff')}
</svg>`

async function render(svg: string, size: number, file: string) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, file))
  console.log(`  ${file} (${size}×${size})`)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  console.log('Writing public/icons:')
  await render(appIcon(4.5), 192, 'icon-192.png')
  await render(appIcon(4.5), 512, 'icon-512.png')
  await render(appIcon(0), 512, 'maskable-512.png')
  await render(appIcon(0), 180, 'apple-touch-icon.png')
  await render(badge, 96, 'badge-96.png')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
