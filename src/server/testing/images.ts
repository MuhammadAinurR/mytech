import sharp from 'sharp'

/**
 * A real image for tests: a flat colour of `width`×`height` pixels. With
 * `orientation`, a JPEG carries that EXIF orientation, as phone photos do.
 */
export async function makeImage(
  format: 'jpeg' | 'png' | 'webp',
  width: number,
  height: number,
  { orientation }: { orientation?: number } = {},
): Promise<Uint8Array> {
  let image = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } },
  })
  if (orientation) image = image.withMetadata({ orientation })
  return new Uint8Array(await image.toFormat(format).toBuffer())
}
