import { expect, test } from '@playwright/test'

test('pressing a control below a field that fails on blur still registers', async ({ page }) => {
  // Without the open animation the dialog is settled at once, which made the
  // old failure deterministic: the name error appeared on blur, pushed the
  // control down between mousedown and mouseup, and the click was lost.
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/transactions/recurring?new=1')
  const dialog = page.getByRole('dialog', { name: 'New recurring rule' })
  await expect(dialog.getByLabel('Name')).toBeFocused()

  const yearly = dialog.getByRole('radio', { name: 'Yearly' })
  await yearly.click()
  await expect(yearly).toBeChecked()
  // The blur still validates the field it left.
  await expect(dialog.getByText('Name this rule.')).toBeVisible()
})
