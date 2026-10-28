/**
 * Why a change to a transaction didn't go through. The UI never offers to
 * change an invoice's payment, so that case only comes from a page left open
 * while the invoice was being marked paid.
 */
export function failedMessage(error: string, verb: 'saved' | 'deleted'): string {
  if (error === 'invoice_payment') return 'This is an invoice payment. Change the invoice instead.'
  if (error === 'not_found') return 'That transaction no longer exists.'
  return `The transaction wasn’t ${verb}. Try again.`
}
