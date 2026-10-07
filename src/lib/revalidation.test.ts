import { describe, expect, it } from 'vitest'

import {
  CLIENT_CACHE_SECONDS,
  FOCUS_REFRESH_AFTER_MS,
  shouldRefreshOnFocus,
  shouldRefreshOnVisit,
} from './revalidation'

const window = CLIENT_CACHE_SECONDS * 1000

describe('shouldRefreshOnVisit', () => {
  it('skips first visits (they are fetched fresh)', () => {
    expect(shouldRefreshOnVisit(undefined, 10_000)).toBe(false)
  })

  it('refreshes revisits painted from the client cache', () => {
    expect(shouldRefreshOnVisit(0, 30_000)).toBe(true)
    expect(shouldRefreshOnVisit(0, window - 1)).toBe(true)
  })

  it('skips revisits that are effectively fresh or past the cache window', () => {
    expect(shouldRefreshOnVisit(0, 500)).toBe(false)
    expect(shouldRefreshOnVisit(0, window)).toBe(false)
  })
})

describe('shouldRefreshOnFocus', () => {
  it('refreshes pages that have been sitting for a while', () => {
    expect(shouldRefreshOnFocus(0, FOCUS_REFRESH_AFTER_MS)).toBe(true)
    expect(shouldRefreshOnFocus(0, FOCUS_REFRESH_AFTER_MS - 1)).toBe(false)
    expect(shouldRefreshOnFocus(undefined, 1e9)).toBe(false)
  })
})
