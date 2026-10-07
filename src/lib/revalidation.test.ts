import { describe, expect, it } from 'vitest'

import { FOCUS_REFRESH_AFTER_MS, shouldRefreshOnFocus } from './revalidation'

describe('shouldRefreshOnFocus', () => {
  it('refreshes pages that have been sitting for a while', () => {
    expect(shouldRefreshOnFocus(0, FOCUS_REFRESH_AFTER_MS)).toBe(true)
    expect(shouldRefreshOnFocus(0, FOCUS_REFRESH_AFTER_MS - 1)).toBe(false)
    expect(shouldRefreshOnFocus(undefined, 1e9)).toBe(false)
  })
})
