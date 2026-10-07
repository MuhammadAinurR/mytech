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
  for (const match of body.matchAll(/--([a-z0-9-]+):\s*(oklch\([^)]*\))/g)) {
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

/** sRGB channels (gamma-encoded, 0–1) and alpha, as a browser composites them. */
function srgb(oklch: string): { r: number; g: number; b: number; alpha: number } {
  const parts = oklch.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/)
  if (!parts) throw new Error(`Cannot parse ${oklch}`)
  const [L, C, H] = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
  const a = C * Math.cos((H * Math.PI) / 180)
  const b = C * Math.sin((H * Math.PI) / 180)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const encode = (v: number) => {
    const x = Math.min(1, Math.max(0, v))
    return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  }
  return {
    r: encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alpha: parts[4] === undefined ? 1 : Number(parts[4]),
  }
}

type Rgb = { r: number; g: number; b: number }

/** A translucent color over another, as the browser blends them (sRGB). */
function compositeColor(top: string, under: string | Rgb): Rgb {
  const t = srgb(top)
  const u = typeof under === 'string' ? srgb(under) : under
  const mix = (x: number, y: number) => t.alpha * x + (1 - t.alpha) * y
  return { r: mix(t.r, u.r), g: mix(t.g, u.g), b: mix(t.b, u.b) }
}

/** Names the intermediate layer where two translucent colors stack. */
const onField = (rgb: Rgb): Rgb => rgb

/** Relative luminance of a translucent color over an opaque one. */
function compositeLuminance(top: string, under: string | Rgb): number {
  const c = compositeColor(top, under)
  const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b)
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

  it('status dots and chart marks reach 3:1 against surfaces (non-text contrast)', () => {
    for (const tone of [
      'success',
      'warning',
      'danger',
      'accent',
      'chart-emphasis',
      'chart-context',
    ]) {
      expect(contrast(tokens[tone]!, tokens.surface!)).toBeGreaterThanOrEqual(3)
    }
  })

  it('has no pure black or white', () => {
    for (const value of Object.values(tokens)) {
      expect(value).not.toMatch(/oklch\(\s*(0|1)(\.0+)?\s+0(\.0+)?\s/)
    }
  })
})

describe.each(Object.entries(themes))('%s glass', (_name, tokens) => {
  // What can sit behind floating glass: the canvas, content, and colored
  // areas such as primary buttons. Blur only averages these, so they bound it.
  const backdrops = ['background', 'surface', 'fill-strong', 'accent']

  it.each(
    ['glass-tint', 'glass-tint-thick'].flatMap((tint) =>
      ['text', 'text-muted'].flatMap((fg) => backdrops.map((under) => [fg, tint, under] as const)),
    ),
  )('%s on %s over %s meets AA (4.5:1)', (fg, tint, under) => {
    const text = luminance(tokens[fg]!)
    const glass = compositeLuminance(tokens[tint]!, tokens[under]!)
    const [hi, lo] = [text, glass].sort((x, y) => y - x) as [number, number]
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['text', 'text-muted'])('%s on the hero glass over the ambient field meets AA', (fg) => {
    // The hero only ever sits on the ambient field: its strongest wash over the canvas.
    const field = onField(compositeColor(tokens['ambient-1']!, tokens.background!))
    const text = luminance(tokens[fg]!)
    const glass = compositeLuminance(tokens['glass-tint-hero']!, field)
    const [hi, lo] = [text, glass].sort((x, y) => y - x) as [number, number]
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(backdrops)('accent-fg on accent glass over %s meets AA', (under) => {
    const text = luminance(tokens['accent-fg']!)
    const glass = compositeLuminance(tokens['glass-tint-accent']!, tokens[under]!)
    const [hi, lo] = [text, glass].sort((x, y) => y - x) as [number, number]
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('paper (documents)', () => {
  const light = block(':root')
  it.each(['ink', 'ink-muted', 'ink-subtle'])('%s on paper meets AA', (token) => {
    expect(contrast(light[token]!, light.paper!)).toBeGreaterThanOrEqual(4.5)
  })

  it('is not redefined for dark mode', () => {
    expect(block('.dark').paper).toBeUndefined()
  })
})
