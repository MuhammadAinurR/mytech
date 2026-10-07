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
  await page.keyboard.press('ArrowRight')
  await expect(announcer).toHaveText(`${name} is over Ongoing.`)
  await page.keyboard.press('ArrowRight')
  await expect(announcer).toHaveText(`${name} is over Done.`)
  await page.keyboard.press('Space')
  await expect(announcer).toHaveText(`${name} dropped in Done.`)
  await expect(column(page, 'Done').getByText(name)).toBeVisible()
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
