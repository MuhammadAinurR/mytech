import { describe, expect, it } from 'vitest'

import { detectImageType } from './images'

describe('detectImageType', () => {
  it('recognizes PNG, JPEG, and WebP by their magic bytes', () => {
    expect(
      detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])),
    ).toBe('image/png')
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(
      detectImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe('image/webp')
  })

  it('rejects SVG, HTML, and empty uploads regardless of their claimed type', () => {
    expect(detectImageType(new TextEncoder().encode('<svg onload="alert(1)">'))).toBeNull()
    expect(detectImageType(new TextEncoder().encode('<!doctype html>'))).toBeNull()
    expect(detectImageType(new Uint8Array())).toBeNull()
  })
})
