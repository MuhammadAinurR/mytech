import { test as setup } from '@playwright/test'

import { signUp } from './helpers'

export const USER_STATE = 'playwright/.auth/user.json'

/** One shared account for every e2e test that just needs to be signed in. */
setup('create shared account', async ({ page }) => {
  await signUp(page, 'Rofiq Example')
  await page.context().storageState({ path: USER_STATE })
})
