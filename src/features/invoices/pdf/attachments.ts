import 'server-only'

import { PDFDocument } from 'pdf-lib'
import sharp, { type OutputInfo } from 'sharp'

import { looksLikePdf, MAX_ATTACHMENT_PAGES } from '../lib/attachments'

export type PdfCheck =
  | { ok: true; pageCount: number }
  | { ok: false; reason: 'not_pdf' | 'encrypted' | 'unreadable' | 'too_many_pages' }

/**
 * Whether an uploaded file can be appended to an invoice: a PDF pdf-lib can
 * read, not encrypted (its pages can't be copied), with 1–200 pages.
 */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfCheck> {
  if (!looksLikePdf(bytes)) return { ok: false, reason: 'not_pdf' }
  let pageCount: number
  try {
    // Read encrypted files too, to report them by name: pdf-lib's own
    // EncryptedPDFError is compiled to ES5, so `instanceof` can't recognise it.
    const document = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    })
    if (document.isEncrypted) return { ok: false, reason: 'encrypted' }
    // pdf-lib is lenient while loading: a broken file often fails only once
    // its page tree is read, so counting pages belongs inside the try.
    pageCount = document.getPageCount()
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
  if (pageCount < 1) return { ok: false, reason: 'unreadable' }
  if (pageCount > MAX_ATTACHMENT_PAGES) return { ok: false, reason: 'too_many_pages' }
  return { ok: true, pageCount }
}

/**
 * Our invoice first, then every page of each attachment in order. The invoice's
 * own metadata (title, author) stays. With nothing to append, the bytes are
 * returned untouched.
 */
export async function appendPdfs(
  invoice: Uint8Array,
  attachments: readonly Uint8Array[],
): Promise<Uint8Array> {
  if (attachments.length === 0) return invoice
  const merged = await PDFDocument.load(invoice, { updateMetadata: false })
  for (const bytes of attachments) {
    const source = await PDFDocument.load(bytes, { updateMetadata: false })
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) merged.addPage(page)
  }
  return merged.save()
}

/** A4 in points, the paper an image attachment is printed on. */
const A4: [number, number] = [595.28, 841.89]
const PAGE_MARGIN = 36
/** Long side, in pixels, an image is reduced to: A4 at 300 dpi, sharp in print. */
export const IMAGE_MAX_SIDE = 3508
/** Points per pixel at most (96 dpi), so a small screenshot isn't blown up to fill a page. */
const MAX_POINTS_PER_PIXEL = 0.75
/** Decoding stops past this many pixels: a 100 MP image is a photo no phone takes yet. */
const MAX_INPUT_PIXELS = 100_000_000

export type ImageToPdf = { ok: true; bytes: Uint8Array } | { ok: false; reason: 'unreadable' }

/**
 * A one-page A4 PDF of an uploaded image (JPEG, PNG or WebP), for suppliers
 * that only send a photo or screenshot of their invoice. The image is turned
 * upright by its EXIF orientation, reduced to print size, flattened onto white,
 * and placed at the top of a portrait or landscape page, whichever it fits.
 */
export async function imageToPdf(bytes: Uint8Array): Promise<ImageToPdf> {
  let image: { data: Buffer; info: OutputInfo }
  try {
    image = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
      .rotate()
      .resize({
        width: IMAGE_MAX_SIDE,
        height: IMAGE_MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      // 4:4:4 keeps small type in screenshots legible.
      .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
      .toBuffer({ resolveWithObject: true })
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  const { width, height } = image.info
  const [pageWidth, pageHeight] = width > height ? [A4[1], A4[0]] : A4
  const scale = Math.min(
    (pageWidth - 2 * PAGE_MARGIN) / width,
    (pageHeight - 2 * PAGE_MARGIN) / height,
    MAX_POINTS_PER_PIXEL,
  )
  const drawnWidth = width * scale
  const drawnHeight = height * scale

  const document = await PDFDocument.create()
  const page = document.addPage([pageWidth, pageHeight])
  page.drawImage(await document.embedJpg(image.data), {
    x: (pageWidth - drawnWidth) / 2,
    y: pageHeight - PAGE_MARGIN - drawnHeight,
    width: drawnWidth,
    height: drawnHeight,
  })
  return { ok: true, bytes: await document.save() }
}
