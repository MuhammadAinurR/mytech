import { describe, expect, it } from 'vitest'

import { createViewCache } from './view-cache'

describe('createViewCache', () => {
  it('returns the latest render for a key', () => {
    const cache = createViewCache()
    expect(cache.get('/invoices')).toBeUndefined()

    const entry = cache.set('/invoices', {}, 'first', {})
    expect(entry.node).toBe('first')
    expect(cache.get('/invoices')).toBe(entry)

    cache.set('/invoices', {}, 'second', {})
    expect(cache.get('/invoices')?.node).toBe('second')
  })

  it('recognizes a render replayed into another view', () => {
    const cache = createViewCache()
    const render = Promise.resolve('a')
    const first = {}
    expect(cache.isReplay(render, first)).toBe(false)

    cache.set('/companies', render, 'a', first)
    // The view that stored it, running its effect again: not a replay.
    expect(cache.isReplay(render, first)).toBe(false)
    // A new view mounted with the same render: back/forward.
    expect(cache.isReplay(render, {})).toBe(true)
    expect(cache.isReplay(Promise.resolve('a'), {})).toBe(false)
  })

  it('evicts the least recently stored entry past the limit', () => {
    const cache = createViewCache(2)
    cache.set('/a', {}, 'a', {})
    cache.set('/b', {}, 'b', {})
    cache.set('/a', {}, 'a2', {}) // refreshed, so /b is now the oldest
    cache.set('/c', {}, 'c', {})

    expect(cache.get('/a')?.node).toBe('a2')
    expect(cache.get('/b')).toBeUndefined()
    expect(cache.get('/c')?.node).toBe('c')
  })
})
