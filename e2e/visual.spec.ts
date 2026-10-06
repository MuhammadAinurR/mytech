import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Browser } from '@playwright/test'

import { signUp } from './helpers'

/**
 * Design review harness for ui/* branches: full-page screenshots at three
 * viewports in both themes, plus an axe scan per page. Screenshots land in
 * artifacts/screenshots (gitignored) for manual review against DESIGN.md.
 *
 *   PW_BASE_URL=http://localhost:3000 VISUAL_PATHS=/styleguide npm run test:visual
 *
 * Protected pages sign in once: with VISUAL_EMAIL/VISUAL_PASSWORD (e.g. the
 * seeded demo account) or, if unset, a freshly created account.
 */

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
]
const themes = ['light', 'dark'] as const
const paths = (process.env.VISUAL_PATHS ?? '/styleguide').split(',').filter(Boolean)
const PUBLIC = ['/login', '/signup', '/styleguide']
const AUTH_STATE = 'artifacts/.visual-auth.json'

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  if (paths.every((path) => PUBLIC.includes(path))) return
  const page = await browser.newPage()
  if (process.env.VISUAL_EMAIL && process.env.VISUAL_PASSWORD) {
    await page.goto('/login')
    await page.getByLabel('Email').fill(process.env.VISUAL_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill(process.env.VISUAL_PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await page.waitForURL(/\/dashboard/)
  } else {
    await signUp(page)
  }
  await page.context().storageState({ path: AUTH_STATE })
  await page.close()
})

function slug(path: string) {
  return path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home'
}

async function open(
  browser: Browser,
  path: string,
  options: { width: number; height: number; theme: (typeof themes)[number] },
) {
  const context = await browser.newContext({
    viewport: { width: options.width, height: options.height },
    colorScheme: options.theme,
    reducedMotion: 'reduce',
    storageState: PUBLIC.includes(path) ? undefined : AUTH_STATE,
  })
  const page = await context.newPage()
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  return page
}

for (const path of paths) {
  test.describe(path, () => {
    for (const theme of themes) {
      test(`axe (${theme})`, async ({ browser }) => {
        const page = await open(browser, path, { width: 1440, height: 900, theme })
        const results = await new AxeBuilder({ page }).analyze()
        const summary = results.violations.map(
          (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        )
        expect(summary, summary.join('\n')).toEqual([])
        await page.context().close()
      })

      for (const viewport of viewports) {
        test(`screenshot ${viewport.name} ${theme}`, async ({ browser }) => {
          const page = await open(browser, path, { ...viewport, theme })
          // On desktop the content panel is the scroll container; let it grow so
          // the full-page capture includes everything, not just the viewport.
          await page.addStyleTag({
            content: '#main { height: auto !important; overflow: visible !important; }',
          })
          await page.screenshot({
            path: `artifacts/screenshots/${slug(path)}-${viewport.name}-${theme}.png`,
            fullPage: true,
            animations: 'disabled',
          })
          await page.context().close()
        })
      }
    }
  })
}
