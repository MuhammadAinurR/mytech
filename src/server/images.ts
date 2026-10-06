import 'server-only'

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp'

/**
 * Identifies an upload by its leading bytes rather than trusting the browser's
 * Content-Type or file extension. SVG is deliberately unsupported (it can carry
 * script).
 */
export function detectImageType(bytes: Uint8Array): ImageMime | null {
  const starts = (signature: number[], offset = 0) =>
    signature.every((byte, i) => bytes[offset + i] === byte)
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (starts([0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}
