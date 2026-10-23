import { describe, expect, it } from 'vitest'

import { makeEncryptedPdf, makePdf, pageSizes } from '@/server/testing/pdfs'

import { appendPdfs, inspectPdf } from './attachments'

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
