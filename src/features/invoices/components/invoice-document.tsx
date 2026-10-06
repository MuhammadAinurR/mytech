import { CompanyLogo } from '@/features/companies/components/company-logo'
import { formatDateOnly } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import type { InvoiceDetail } from '@/server/queries/invoices'

import { formatPercent, formatQuantity } from '../lib/totals'

/**
 * The invoice as a document. Paper tokens only, so it reads the same on
 * screen in either theme and when printed. The PDF mirrors this layout.
 */
export function InvoiceDocument({
  invoice,
  className,
}: {
  invoice: InvoiceDetail
  className?: string
}) {
  const money = (amountMinor: number) => formatMoney(amountMinor, invoice.currency)
  const { company } = invoice

  return (
    <article
      className={cn(
        'print-sheet bg-paper px-6 py-8 text-ink sm:px-12 sm:py-12',
        '[--color-fg:var(--ink)] [--color-muted:var(--ink-muted)]',
        className,
      )}
      aria-label={`Invoice ${invoice.numberLabel}`}
    >
      <header className="flex flex-col-reverse gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          {company.hasLogo ? (
            <CompanyLogo company={company} size={48} className="border-rule" />
          ) : null}
          <div>
            <p className="text-md font-semibold">{company.name}</p>
            {company.address ? (
              <p className="mt-1 text-sm whitespace-pre-line text-ink-muted">{company.address}</p>
            ) : null}
            <p className="mt-1 text-sm text-ink-muted">
              {[company.email, company.taxId ? `Tax ID ${company.taxId}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="sm:text-right">
          <h2 className="text-xl font-semibold">Invoice</h2>
          <p className="mt-1 font-mono text-sm text-ink-muted">{invoice.numberLabel}</p>
        </div>
      </header>

      <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-rule py-6 sm:grid-cols-4">
        <div className="col-span-2">
          <dt className="text-xs text-ink-subtle">Billed to</dt>
          <dd className="mt-1 text-sm">
            <span className="font-medium">{invoice.clientName}</span>
            {invoice.clientAddress ? (
              <span className="block whitespace-pre-line text-ink-muted">
                {invoice.clientAddress}
              </span>
            ) : null}
            {invoice.clientEmail ? (
              <span className="block text-ink-muted">{invoice.clientEmail}</span>
            ) : null}
            {invoice.clientTaxId ? (
              <span className="block text-ink-muted">Tax ID {invoice.clientTaxId}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle">Issued</dt>
          <dd className="mt-1 tabular text-sm">{formatDateOnly(invoice.issueDate)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-subtle">Due</dt>
          <dd className="mt-1 tabular text-sm">{formatDateOnly(invoice.dueDate)}</dd>
        </div>
      </dl>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-xs text-ink-subtle">
            <th scope="col" className="pb-2 text-left font-medium">
              Description
            </th>
            <th scope="col" className="w-16 pb-2 text-right font-medium">
              Qty
            </th>
            <th scope="col" className="hidden w-32 pb-2 text-right font-medium sm:table-cell">
              Unit price
            </th>
            <th scope="col" className="w-32 pb-2 text-right font-medium">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="print-avoid-break border-b border-rule align-top">
              <td className="py-3 pr-4 whitespace-pre-line">{item.description}</td>
              <td className="py-3 text-right tabular">{formatQuantity(item.quantityMilli)}</td>
              <td className="hidden py-3 text-right tabular sm:table-cell">
                {money(item.unitPriceMinor)}
              </td>
              <td className="py-3 text-right tabular">{money(item.lineTotalMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-avoid-break mt-6 flex flex-col items-end">
        <dl className="w-full max-w-72 text-sm">
          <Row label="Subtotal" value={money(invoice.subtotalMinor)} />
          {invoice.discountMinor > 0 ? (
            <Row label="Discount" value={`−${money(invoice.discountMinor)}`} />
          ) : null}
          {invoice.taxRateBps > 0 ? (
            <Row
              label={`Tax (${formatPercent(invoice.taxRateBps)}%)`}
              value={money(invoice.taxMinor)}
            />
          ) : null}
          <div className="mt-2 flex items-baseline justify-between border-t border-rule-strong pt-3">
            <dt className="font-medium">
              {invoice.status === 'paid' ? 'Total paid' : 'Amount due'}
            </dt>
            <dd className="tabular text-lg font-semibold">{money(invoice.totalMinor)}</dd>
          </div>
        </dl>
        {invoice.status === 'paid' && invoice.paidAt ? (
          <p className="mt-1 w-full max-w-72 text-right text-xs text-ink-subtle">
            Paid{' '}
            {new Intl.DateTimeFormat('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }).format(invoice.paidAt)}
          </p>
        ) : null}
      </div>

      {invoice.notes || company.paymentDetails ? (
        <footer className="print-avoid-break mt-12 grid gap-8 border-t border-rule pt-6 text-sm sm:grid-cols-2">
          {company.paymentDetails ? (
            <div>
              <p className="text-xs text-ink-subtle">Payment</p>
              <p className="mt-1 whitespace-pre-line text-ink-muted">{company.paymentDetails}</p>
            </div>
          ) : null}
          {invoice.notes ? (
            <div>
              <p className="text-xs text-ink-subtle">Notes</p>
              <p className="mt-1 whitespace-pre-line text-ink-muted">{invoice.notes}</p>
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  )
}
