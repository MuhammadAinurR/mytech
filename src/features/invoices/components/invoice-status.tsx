import { StatusDot, type StatusTone } from '@/components/ui/status-dot'

import { type InvoiceStatus } from '../schema'

/** Draft · Sent · Overdue · Paid, as a dot and plain text. */
export function InvoiceStatusDot({
  status,
  dueDate,
  today,
}: {
  status: InvoiceStatus
  dueDate: string
  today: string
}) {
  const overdue = status === 'sent' && dueDate < today
  const [tone, label]: [StatusTone, string] = overdue
    ? ['danger', 'Overdue']
    : status === 'paid'
      ? ['success', 'Paid']
      : status === 'sent'
        ? ['accent', 'Sent']
        : ['neutral', 'Draft']
  return <StatusDot tone={tone}>{label}</StatusDot>
}
