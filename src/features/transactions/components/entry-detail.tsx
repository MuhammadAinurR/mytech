import type { TransactionItem } from '@/server/queries/transactions'

/** An entry's secondary line: the invoice it records a payment for, or its note. */
export function EntryDetail({ item }: { item: TransactionItem }) {
  if (item.invoiceNumber) {
    return (
      <>
        Payment for <span className="font-mono">{item.invoiceNumber}</span>
      </>
    )
  }
  return item.note
}

/** Where an invoice payment entry is changed: its invoice. */
export function invoiceHref(item: TransactionItem): string | null {
  return item.invoiceId ? `/invoices/${item.invoiceId}` : null
}
