import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Design review harness for ui/* branches: full-page screenshots at three
 * viewports in both themes, plus an axe scan per page. Screenshots land in
 * artifacts/screenshots (gitignored) for manual review against DESIGN.md.
 *
 *   PW_BASE_URL=http://localhost:3000 VISUAL_PATHS=/styleguide npm run test:visual
 */

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
]
const themes = ['light', 'dark'] as const
const paths = (process.env.VISUAL_PATHS ?? '/styleguide').split(',').filter(Boolean)

function slug(path: string) {
  return path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home'
}

for (const path of paths) {
  test.describe(path, () => {
    for (const theme of themes) {
      test(`axe (${theme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const results = await new AxeBuilder({ page }).analyze()
        const summary = results.violations.map(
          (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        )
        expect(summary, summary.join('\n')).toEqual([])
      })

      for (const viewport of viewports) {
        test(`screenshot ${viewport.name} ${theme}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height })
          await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
          await page.goto(path)
          await page.waitForLoadState('networkidle')
          await page.screenshot({
            path: `artifacts/screenshots/${slug(path)}-${viewport.name}-${theme}.png`,
            fullPage: true,
            animations: 'disabled',
          })
        })
      }
    }
  })
}
