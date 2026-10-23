import { PDFDocument } from 'pdf-lib'

/**
 * A real PDF for tests: `pages` blank pages of `size` points, so tests can tell
 * documents apart in a merged file by their page sizes.
 */
export async function makePdf(pages = 1, size: [number, number] = [595, 842]): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  for (let i = 0; i < pages; i++) document.addPage(size)
  return document.save()
}

/** The same kind of PDF, saved with a classic trailer and marked encrypted. */
export async function makeEncryptedPdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.addPage()
  const text = new TextDecoder('latin1').decode(await document.save({ useObjectStreams: false }))
  // Inserted after the xref table, so every byte offset in it stays valid.
  return new Uint8Array(
    Buffer.from(
      text.replace(/trailer\s*<<\s*/, (head) => `${head}/Encrypt 1 0 R\n`),
      'latin1',
    ),
  )
}

/** Page sizes, in order, of a PDF: how tests check what went where. */
export async function pageSizes(bytes: Uint8Array): Promise<[number, number][]> {
  const document = await PDFDocument.load(bytes)
  return document.getPages().map((page) => {
    const { width, height } = page.getSize()
    return [Math.round(width), Math.round(height)]
  })
}
