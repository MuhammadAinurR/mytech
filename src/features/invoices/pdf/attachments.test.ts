import { describe, expect, it } from 'vitest'

import { PDFDocument } from 'pdf-lib'

import { makeImage } from '@/server/testing/images'
import { makeEncryptedPdf, makePdf, pageSizes } from '@/server/testing/pdfs'

import { appendPdfs, imageToPdf, inspectPdf } from './attachments'

const A4: [number, number] = [595, 842]
const LETTER: [number, number] = [612, 792]
const RECEIPT: [number, number] = [300, 600]

describe('inspectPdf', () => {
  it('accepts a readable PDF and counts its pages', async () => {
    expect(await inspectPdf(await makePdf(3))).toEqual({ ok: true, pageCount: 3 })
  })

  it('names why a file can’t be attached', async () => {
    const text = (value: string) => new TextEncoder().encode(value)
    expect(await inspectPdf(text('PK\u0003\u0004 a zip with a .pdf name'))).toEqual({
      ok: false,
      reason: 'not_pdf',
    })
    expect(await inspectPdf(text('%PDF-1.7\nnot really a pdf'))).toEqual({
      ok: false,
      reason: 'unreadable',
    })
    expect(await inspectPdf(await makeEncryptedPdf())).toEqual({ ok: false, reason: 'encrypted' })
    expect(await inspectPdf(await makePdf(201))).toEqual({ ok: false, reason: 'too_many_pages' })
  })
})

describe('appendPdfs', () => {
  it('puts the invoice first and then each attachment’s pages in order', async () => {
    const invoice = await makePdf(1, A4)
    const merged = await appendPdfs(invoice, [await makePdf(2, LETTER), await makePdf(1, RECEIPT)])
    expect(await pageSizes(merged)).toEqual([A4, LETTER, LETTER, RECEIPT])
  })

  it('returns the invoice unchanged when nothing is attached', async () => {
    const invoice = await makePdf(1)
    expect(await appendPdfs(invoice, [])).toBe(invoice)
  })
})

describe('imageToPdf', () => {
  const A4_LANDSCAPE: [number, number] = [842, 595]
  const converted = async (bytes: Uint8Array) => {
    const result = await imageToPdf(bytes)
    if (!result.ok) throw new Error(result.reason)
    return result.bytes
  }

  it.each([
    ['a portrait JPEG', () => makeImage('jpeg', 1240, 1754), [A4]],
    ['a landscape PNG screenshot', () => makeImage('png', 1920, 1080), [A4_LANDSCAPE]],
    ['a WebP', () => makeImage('webp', 800, 1000), [A4]],
  ])('puts %s on one A4 page that suits its shape', async (_label, make, sizes) => {
    const pdf = await converted(await make())
    expect(await pageSizes(pdf)).toEqual(sizes)
    expect(await inspectPdf(pdf)).toEqual({ ok: true, pageCount: 1 })
  })

  it('turns a phone photo upright by its EXIF orientation', async () => {
    // Stored landscape, shown portrait: orientation 6 is "rotate 90° clockwise".
    const photo = await makeImage('jpeg', 1600, 1200, { orientation: 6 })
    expect(await pageSizes(await converted(photo))).toEqual([A4])
  })

  it('refuses bytes that only start like an image', async () => {
    const fake = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4])
    expect(await imageToPdf(fake)).toEqual({ ok: false, reason: 'unreadable' })
  })

  it('merges after an invoice like any other attachment', async () => {
    const merged = await appendPdfs(await makePdf(1, A4), [
      await converted(await makeImage('png', 1920, 1080)),
    ])
    expect(await pageSizes(merged)).toEqual([A4, A4_LANDSCAPE])
    expect((await PDFDocument.load(merged)).getPageCount()).toBe(2)
  })
})
