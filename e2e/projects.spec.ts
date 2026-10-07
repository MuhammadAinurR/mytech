import { expect, test, type Page } from '@playwright/test'

const column = (page: Page, name: string) =>
  page.getByRole('region', { name: new RegExp(`^${name}`) })

test('create a project and move it through the board without dragging', async ({ page }) => {
  const name = `Board test ${Date.now()}`
  await page.goto('/projects')
  await page.getByRole('button', { name: 'New project' }).click()
  const dialog = page.getByRole('dialog', { name: 'New project' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('button', { name: 'Add project' }).click()
  await expect(page.getByText('Project added')).toBeVisible()
  await expect(column(page, 'To do').getByText(name)).toBeVisible()

  // Moving into Ongoing asks for dates first.
  await page.getByRole('button', { name: `Actions for ${name}` }).click({ force: true })
  await page.getByRole('menuitem', { name: 'Ongoing' }).click()
  const dates = page.getByRole('dialog', { name: 'When is it happening?' })
  await dates.getByLabel('Start').fill('2026-10-01')
  await dates.getByLabel('End').fill('2026-09-01')
  await dates.getByRole('button', { name: 'Start project' }).click()
  await expect(dates.getByText('End on or after the start date.')).toBeVisible()
  await dates.getByLabel('End').fill('2026-10-31')
  await dates.getByRole('button', { name: 'Start project' }).click()
  await expect(column(page, 'Ongoing').getByText(name)).toBeVisible()
  await expect(column(page, 'Ongoing').getByText('Oct 1 – Oct 31').first()).toBeVisible()

  await page.reload()
  await expect(column(page, 'Ongoing').getByText(name)).toBeVisible()

  await page.getByRole('button', { name: `Actions for ${name}` }).click({ force: true })
  await page.getByRole('menuitem', { name: 'Done' }).click()
  await expect(column(page, 'Done').getByText(name)).toBeVisible()
  await page.reload()
  await expect(column(page, 'Done').getByText(name)).toBeVisible()
})

test('moves a card with the keyboard and keeps it after reload', async ({ page }) => {
  const name = `Keyboard test ${Date.now()}`
  await page.goto('/projects?new=1')
  await page.getByRole('dialog', { name: 'New project' }).getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Add project' }).click()
  await expect(column(page, 'To do').getByText(name)).toBeVisible()
  await page.waitForLoadState('networkidle')

  // To do → Done in one go would skip Ongoing (which needs dates): move right twice.
  const handle = page.getByRole('button', { name: `Move ${name}` })
  const announcer = page.getByRole('status').filter({ hasText: name })
  await handle.focus()
  await page.keyboard.press('Space')
  // Lifting announces the pick-up, then immediately that it's over its own column.
  await expect(announcer).toHaveText(new RegExp(`Picked up ${name}\\.|${name} is over To do\\.`))
  // dnd-kit attaches its key listener a tick after lifting; re-press only
  // while the card visibly hasn't moved, so a press is never counted twice.
  for (const column of ['Ongoing', 'Done']) {
    await expect(async () => {
      if (!(await announcer.textContent())?.includes(`over ${column}`)) {
        await page.keyboard.press('ArrowRight')
      }
      await expect(announcer).toHaveText(`${name} is over ${column}.`, { timeout: 500 })
    }).toPass({ timeout: 5_000 })
  }
  // The board updates optimistically; reload only once the move is saved.
  const saved = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().endsWith('/projects'),
  )
  await page.keyboard.press('Space')
  await expect(announcer).toHaveText(`${name} dropped in Done.`)
  await expect(column(page, 'Done').getByText(name)).toBeVisible()
  await saved
  await page.reload()
  await expect(column(page, 'Done').getByText(name)).toBeVisible()
})

test('cancelling the dates prompt puts the card back', async ({ page }) => {
  const name = `Cancel test ${Date.now()}`
  await page.goto('/projects?new=1')
  await page.getByRole('dialog', { name: 'New project' }).getByLabel('Name').fill(name)
  await page.getByRole('button', { name: 'Add project' }).click()
  await expect(column(page, 'To do').getByText(name)).toBeVisible()
  await page.getByRole('button', { name: `Actions for ${name}` }).click({ force: true })
  await page.getByRole('menuitem', { name: 'Ongoing' }).click()
  await page
    .getByRole('dialog', { name: 'When is it happening?' })
    .getByRole('button', { name: 'Cancel' })
    .click()
  await expect(column(page, 'To do').getByText(name)).toBeVisible()
})

test('the calendar shows ongoing projects as date ranges', async ({ page }) => {
  const name = `Calendar test ${Date.now()}`
  await page.goto('/projects/calendar?month=2031-03')
  await expect(page.getByText('No ongoing projects in March 2031')).toBeVisible()

  await page.getByRole('button', { name: 'New project' }).click()
  const dialog = page.getByRole('dialog', { name: 'New project' })
  await dialog.getByLabel('Name').fill(name)
  await dialog.getByRole('radio', { name: 'Ongoing' }).click()
  await dialog.getByLabel('Start').fill('2031-03-10')
  await dialog.getByLabel('End').fill('2031-03-20')
  await dialog.getByRole('button', { name: 'Add project' }).click()

  const bars = page.getByRole('button', { name: `${name}, Mar 10 – Mar 20, 2031` })
  // Mar 10–20, 2031 spans two Monday-first weeks: one bar segment per week.
  await expect(bars).toHaveCount(2)
  await bars.first().click()
  await expect(page.getByRole('dialog', { name: 'Edit project' }).getByLabel('Name')).toHaveValue(
    name,
  )
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Next month' }).click()
  await expect(page).toHaveURL(/month=2031-04/)
  await page.getByRole('link', { name: 'Board', exact: true }).click()
  await expect(page).toHaveURL(/\/projects$/)
})
