import 'server-only'

import { join } from 'node:path'

import {
  Document,
  Font,
  // Renamed so the HTML img alt-text rule (meant for next/image) doesn't apply:
  // PDF images have no alt attribute.
  Image as PdfImage,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

import { formatDateOnly } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { InvoiceDetail } from '@/server/queries/invoices'

import { formatPercent, formatQuantity } from '../lib/totals'
import { h } from './node-react'

/**
 * The invoice as a PDF, mirroring the on-screen paper document. Colors are the
 * paper tokens from globals.css converted to sRGB hex (PDF has no OKLCH).
 */
const paper = {
  paper: '#fdfdfe',
  ink: '#17181b',
  inkMuted: '#53555a',
  inkSubtle: '#696c71',
  rule: '#dddee0',
  ruleStrong: '#bcbec0',
}

const fontDir = join(process.cwd(), 'node_modules/geist/dist/fonts')
Font.register({
  family: 'Geist',
  fonts: [
    { src: join(fontDir, 'geist-sans/Geist-Regular.ttf'), fontWeight: 400 },
    { src: join(fontDir, 'geist-sans/Geist-Medium.ttf'), fontWeight: 500 },
    { src: join(fontDir, 'geist-sans/Geist-SemiBold.ttf'), fontWeight: 600 },
  ],
})
Font.register({ family: 'Geist Mono', src: join(fontDir, 'geist-mono/GeistMono-Regular.ttf') })
// Never hyphenate names, numbers, or addresses.
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    backgroundColor: paper.paper,
    color: paper.ink,
    fontFamily: 'Geist',
    fontSize: 9.5,
    lineHeight: 1.45,
    // Ligatures off so copied/extracted text keeps every letter ("fi" stays
    // two characters); tabular figures so amounts align like on screen.
    fontFeatureSettings: { liga: false, tnum: true },
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 52,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  logo: { width: 36, height: 36, objectFit: 'contain', marginBottom: 10 },
  companyName: { fontSize: 12, fontWeight: 600 },
  muted: { color: paper.inkMuted },
  subtle: { color: paper.inkSubtle, fontSize: 8 },
  title: {
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 600,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  number: { fontFamily: 'Geist Mono', color: paper.inkMuted, textAlign: 'right', marginTop: 4 },
  meta: {
    flexDirection: 'row',
    marginTop: 28,
    paddingVertical: 14,
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: paper.rule,
  },
  billTo: { flex: 2 },
  metaCell: { flex: 1 },
  label: { color: paper.inkSubtle, fontSize: 8, marginBottom: 3 },
  table: { marginTop: 22 },
  row: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 0.75,
    borderColor: paper.rule,
  },
  headRow: {
    flexDirection: 'row',
    paddingBottom: 5,
    borderBottomWidth: 0.75,
    borderColor: paper.ruleStrong,
  },
  description: { flex: 1, paddingRight: 12 },
  qty: { width: 44, textAlign: 'right' },
  price: { width: 84, textAlign: 'right' },
  amount: { width: 90, textAlign: 'right' },
  totals: { marginTop: 14, marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2.5 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 0.75,
    borderColor: paper.ruleStrong,
  },
  grandAmount: { fontSize: 14, fontWeight: 600 },
  footer: {
    flexDirection: 'row',
    marginTop: 36,
    paddingTop: 14,
    borderTopWidth: 0.75,
    borderColor: paper.rule,
    gap: 24,
  },
  footerCell: { flex: 1 },
  pageNumber: {
    position: 'absolute',
    bottom: 28,
    right: 52,
    color: paper.inkSubtle,
    fontSize: 7.5,
  },
})

export type PdfLogo = { data: Buffer; mime: string } | null

function row(label: string, value: string) {
  return h(
    View,
    { style: styles.totalRow },
    h(Text, { style: styles.muted }, label),
    h(Text, null, value),
  )
}

/** Built with h() (node_modules React) rather than JSX; see node-react.ts. */
export function invoicePdfDocument(invoice: InvoiceDetail, logo: PdfLogo) {
  const money = (amountMinor: number) => formatMoney(amountMinor, invoice.currency)
  const { company } = invoice
  // react-pdf can draw PNG and JPEG; WebP logos are left out of the PDF.
  const drawableLogo =
    logo && (logo.mime === 'image/png' || logo.mime === 'image/jpeg') ? logo : null

  const header = h(
    View,
    { style: styles.header },
    h(
      View,
      { style: { maxWidth: 300 } },
      drawableLogo
        ? h(PdfImage, {
            style: styles.logo,
            src: {
              data: drawableLogo.data,
              format: drawableLogo.mime === 'image/png' ? 'png' : 'jpg',
            },
          })
        : null,
      h(Text, { style: styles.companyName }, company.name),
      company.address
        ? h(Text, { style: [styles.muted, { marginTop: 2 }] }, company.address)
        : null,
      h(
        Text,
        { style: [styles.muted, { marginTop: 2 }] },
        [company.email, company.taxId ? `Tax ID ${company.taxId}` : null]
          .filter(Boolean)
          .join(' · '),
      ),
    ),
    h(
      View,
      null,
      h(Text, { style: styles.title }, 'Invoice'),
      h(Text, { style: styles.number }, invoice.numberLabel),
    ),
  )

  const meta = h(
    View,
    { style: styles.meta },
    h(
      View,
      { style: styles.billTo },
      h(Text, { style: styles.label }, 'Billed to'),
      h(Text, { style: { fontWeight: 500 } }, invoice.clientName),
      invoice.clientAddress ? h(Text, { style: styles.muted }, invoice.clientAddress) : null,
      invoice.clientEmail ? h(Text, { style: styles.muted }, invoice.clientEmail) : null,
      invoice.clientTaxId
        ? h(Text, { style: styles.muted }, `Tax ID ${invoice.clientTaxId}`)
        : null,
    ),
    h(
      View,
      { style: styles.metaCell },
      h(Text, { style: styles.label }, 'Issued'),
      h(Text, null, formatDateOnly(invoice.issueDate)),
    ),
    h(
      View,
      { style: styles.metaCell },
      h(Text, { style: styles.label }, 'Due'),
      h(Text, null, formatDateOnly(invoice.dueDate)),
    ),
  )

  const table = h(
    View,
    { style: styles.table },
    h(
      View,
      { style: styles.headRow, fixed: true },
      h(Text, { style: [styles.description, styles.subtle] }, 'Description'),
      h(Text, { style: [styles.qty, styles.subtle] }, 'Qty'),
      h(Text, { style: [styles.price, styles.subtle] }, 'Unit price'),
      h(Text, { style: [styles.amount, styles.subtle] }, 'Amount'),
    ),
    ...invoice.items.map((item) =>
      h(
        View,
        { key: item.id, style: styles.row, wrap: false },
        h(Text, { style: styles.description }, item.description),
        h(Text, { style: styles.qty }, formatQuantity(item.quantityMilli)),
        h(Text, { style: styles.price }, money(item.unitPriceMinor)),
        h(Text, { style: styles.amount }, money(item.lineTotalMinor)),
      ),
    ),
  )

  const totals = h(
    View,
    { style: styles.totals, wrap: false },
    row('Subtotal', money(invoice.subtotalMinor)),
    invoice.discountMinor > 0 ? row('Discount', `−${money(invoice.discountMinor)}`) : null,
    invoice.taxRateBps > 0
      ? row(`Tax (${formatPercent(invoice.taxRateBps)}%)`, money(invoice.taxMinor))
      : null,
    h(
      View,
      { style: styles.grandTotal },
      h(
        Text,
        { style: { fontWeight: 500 } },
        invoice.status === 'paid' ? 'Total paid' : 'Amount due',
      ),
      h(Text, { style: styles.grandAmount }, money(invoice.totalMinor)),
    ),
  )

  const footer =
    company.paymentDetails || invoice.notes
      ? h(
          View,
          { style: styles.footer, wrap: false },
          company.paymentDetails
            ? h(
                View,
                { style: styles.footerCell },
                h(Text, { style: styles.label }, 'Payment'),
                h(Text, { style: styles.muted }, company.paymentDetails),
              )
            : null,
          invoice.notes
            ? h(
                View,
                { style: styles.footerCell },
                h(Text, { style: styles.label }, 'Notes'),
                h(Text, { style: styles.muted }, invoice.notes),
              )
            : null,
        )
      : null

  const pageNumber = h(Text, {
    style: styles.pageNumber,
    fixed: true,
    render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
      totalPages > 1 ? `${pageNumber} / ${totalPages}` : '',
  })

  return h(
    Document,
    {
      title: `Invoice ${invoice.numberLabel}`,
      author: company.name,
      subject: `Invoice ${invoice.numberLabel} for ${invoice.clientName}`,
      creator: 'Workbench',
      producer: 'Workbench',
    },
    h(Page, { size: 'A4', style: styles.page }, header, meta, table, totals, footer, pageNumber),
  )
}

export function renderInvoicePdf(invoice: InvoiceDetail, logo: PdfLogo): Promise<Buffer> {
  return renderToBuffer(invoicePdfDocument(invoice, logo))
}

/** A download-safe filename like "SR-0042.pdf". */
export function pdfFilename(numberLabel: string): string {
  const safe = numberLabel
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  return `${safe || 'invoice'}.pdf`
}
