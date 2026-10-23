/**
 * PDFs attached to an invoice, such as a hosting or cloud provider's own
 * invoice, appended after ours in the downloaded PDF. The per-file limits match
 * the CHECKs on `invoice_attachments`.
 */
export const MAX_ATTACHMENTS = 10
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
/** All of one invoice's attachments together, so the merged PDF stays quick to build and send. */
export const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024
export const MAX_ATTACHMENT_PAGES = 200

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

/**
 * Whether the bytes start like a PDF. The format allows the header anywhere in
 * the first 1 KB, after junk some generators write. The browser's Content-Type
 * and the file extension are never trusted.
 */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, 1024) - PDF_HEADER.length
  for (let i = 0; i <= end; i++) {
    if (PDF_HEADER.every((byte, offset) => bytes[i + offset] === byte)) return true
  }
  return false
}

/**
 * The name to store and show: no folders, control characters, or quotes, at
 * most 200 characters, always ending in `.pdf`.
 */
export function cleanAttachmentName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? ''
  const cleaned = base
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f\u007f"]/g, '')
    .trim()
  const stem = cleaned.replace(/\.pdf$/i, '').trim() || 'attachment'
  return `${stem.slice(0, 196)}.pdf`
}

/** Why an upload was refused: the error codes the upload route returns. */
export type AttachmentUploadError =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'invalid'
  | 'not_pdf'
  | 'encrypted'
  | 'unreadable'
  | 'too_many_pages'
  | 'file_too_large'
  | 'too_many'
  | 'too_large'

export const ATTACHMENT_UPLOAD_MESSAGES: Record<AttachmentUploadError, string> = {
  unauthorized: 'Your session ended. Sign in again to attach files.',
  forbidden: 'That upload was refused. Reload the page and try again.',
  not_found: 'That invoice no longer exists.',
  rate_limited: 'Too many uploads in a short time. Try again in a few minutes.',
  invalid: 'Choose a PDF to attach.',
  not_pdf: 'Only PDF files can be attached.',
  encrypted:
    'This PDF is password-protected. Open it, print it to a new PDF, and attach that instead.',
  unreadable: 'This PDF couldn’t be read. It may be damaged.',
  too_many_pages: 'A PDF can have at most 200 pages.',
  file_too_large: 'A PDF can be at most 10 MB.',
  too_many: 'An invoice can have at most 10 attachments.',
  too_large: 'An invoice’s attachments can be at most 25 MB together.',
}

export function attachmentObjectKey(userId: string, invoiceId: string, attachmentId: string) {
  return `${userId}/${invoiceId}/${attachmentId}.pdf`
}

/**
 * A Content-Disposition value that survives any file name: an ASCII-only
 * `filename` for old clients and the exact name in RFC 5987 `filename*`.
 */
export function contentDisposition(kind: 'attachment' | 'inline', fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/[\\"]/g, '_')
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

/** "820 KB", "3.4 MB": file sizes as people read them (1 KB = 1024 bytes). */
export function formatFileSize(bytes: number, locale = 'en-US'): string {
  const units = ['B', 'KB', 'MB'] as const
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${units[unit]}`
}
