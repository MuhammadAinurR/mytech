import { describe, expect, it } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  it('keeps the last conflicting token class', () => {
    expect(cn('text-sm text-muted', 'text-md')).toBe('text-muted text-md')
    expect(cn('shadow-popover', 'shadow-dialog')).toBe('shadow-dialog')
    expect(cn('bg-surface', false && 'bg-fill', 'rounded-sm', 'rounded-md')).toBe(
      'bg-surface rounded-md',
    )
  })

  it('does not treat text color and size as conflicts', () => {
    expect(cn('text-sm', 'text-subtle')).toBe('text-sm text-subtle')
  })
})
