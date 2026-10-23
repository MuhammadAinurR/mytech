import { describe, expect, it } from 'vitest'

import {
  attachmentObjectKey,
  cleanAttachmentName,
  contentDisposition,
  formatFileSize,
  looksLikePdf,
} from './attachments'

const bytes = (text: string) => new TextEncoder().encode(text)

describe('looksLikePdf', () => {
  it('finds the header at the start or after junk in the first kilobyte', () => {
    expect(looksLikePdf(bytes('%PDF-1.7\n…'))).toBe(true)
    expect(looksLikePdf(bytes(`${'x'.repeat(500)}%PDF-1.4`))).toBe(true)
  })

  it('rejects other files, a header past 1 KB, and empty input', () => {
    expect(looksLikePdf(bytes('PK\u0003\u0004 a zip renamed to .pdf'))).toBe(false)
    expect(looksLikePdf(bytes(`${'x'.repeat(1100)}%PDF-1.4`))).toBe(false)
    expect(looksLikePdf(new Uint8Array())).toBe(false)
  })
})

describe('cleanAttachmentName', () => {
  it.each([
    ['AWS Invoice Oct 2026.pdf', 'AWS Invoice Oct 2026.pdf'],
    ['C:\\Users\\me\\Downloads\\hetzner.PDF', 'hetzner.pdf'],
    ['../../etc/passwd', 'passwd.pdf'],
    ['  tab\tand\nnewline "quoted".pdf  ', 'tab and newline quoted.pdf'],
    ['.pdf', 'attachment.pdf'],
    ['', 'attachment.pdf'],
    ['Tagihan Biznet – Oktober.pdf', 'Tagihan Biznet – Oktober.pdf'],
  ])('%j → %j', (raw, expected) => {
    expect(cleanAttachmentName(raw)).toBe(expected)
  })

  it('keeps the name within 200 characters, extension included', () => {
    const name = cleanAttachmentName(`${'a'.repeat(400)}.pdf`)
    expect(name).toHaveLength(200)
    expect(name.endsWith('.pdf')).toBe(true)
  })
})

describe('attachmentObjectKey', () => {
  it('nests the file under its owner and invoice', () => {
    expect(attachmentObjectKey('u', 'i', 'a')).toBe('u/i/a.pdf')
  })
})

describe('contentDisposition', () => {
  it('gives old clients an ASCII name and new ones the exact name', () => {
    expect(contentDisposition('attachment', 'Tagihan "Oktober" – é.pdf')).toBe(
      `attachment; filename="Tagihan _Oktober_ _ _.pdf"; filename*=UTF-8''Tagihan%20%22Oktober%22%20%E2%80%93%20%C3%A9.pdf`,
    )
  })
})

describe('formatFileSize', () => {
  it.each([
    [820, '820 B'],
    [48_213, '47 KB'],
    [3 * 1024 * 1024 + 400_000, '3.4 MB'],
    [10 * 1024 * 1024, '10 MB'],
  ])('%d bytes → %s', (input, expected) => {
    expect(formatFileSize(input)).toBe(expected)
  })
})
