import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Guards the WCAG AA promise in DESIGN.md: every text token must reach 4.5:1 on
 * every surface it can sit on, in both themes. Values are read from globals.css
 * so the test fails as soon as a token drifts.
 */

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No ${selector} block in globals.css`)
  const body = css.slice(start, css.indexOf('\n}', start))
  const tokens: Record<string, string> = {}
  for (const match of body.matchAll(/--([a-z-]+):\s*(oklch\([^)]*\))/g)) {
    tokens[match[1]!] = match[2]!
  }
  return tokens
}

function luminance(oklch: string): number {
  const parts = oklch.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*[\d.]+)?\)/)
  if (!parts) throw new Error(`Cannot parse ${oklch}`)
  const [L, C, H] = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const themes = { light: block(':root'), dark: block('.dark') }
const textTokens = ['text', 'text-muted', 'text-subtle', 'danger']
const surfaces = ['background', 'surface', 'surface-raised', 'fill']

describe.each(Object.entries(themes))('%s theme', (_name, tokens) => {
  it.each(textTokens.flatMap((fg) => surfaces.map((bg) => [fg, bg] as const)))(
    '%s on %s meets AA (4.5:1)',
    (fg, bg) => {
      expect(contrast(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('accent text meets AA on surfaces, and accent-fg meets AA on accent', () => {
    expect(contrast(tokens.accent!, tokens.surface!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens['accent-fg']!, tokens.accent!)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(tokens['accent-fg']!, tokens['accent-hover']!)).toBeGreaterThanOrEqual(4.5)
  })

  it('focus ring (accent) reaches 3:1 against the page', () => {
    expect(contrast(tokens.accent!, tokens.background!)).toBeGreaterThanOrEqual(3)
  })

  it('status dots reach 3:1 against surfaces (non-text contrast)', () => {
    for (const tone of ['success', 'warning', 'danger', 'accent']) {
      expect(contrast(tokens[tone]!, tokens.surface!)).toBeGreaterThanOrEqual(3)
    }
  })

  it('has no pure black or white', () => {
    for (const value of Object.values(tokens)) {
      expect(value).not.toMatch(/oklch\(\s*(0|1)(\.0+)?\s+0(\.0+)?\s/)
    }
  })
})
