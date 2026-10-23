import 'server-only'

import { PDFDocument } from 'pdf-lib'

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
