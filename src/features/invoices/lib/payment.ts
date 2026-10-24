import { type InvoiceStatus } from '../schema'

export type BankTransfer = { bankName: string; accountNumber: string; accountName: string }

/**
 * Where an unpaid invoice asks the client to transfer payment: the issuing
 * company's bank account, when it has one. Paid invoices don't ask for
 * payment, so they get none. Shared by the on-screen document and the PDF.
 */
export function bankTransfer(
  company: {
    bankName: string | null
    bankAccountNumber: string | null
    bankAccountName: string | null
  },
  status: InvoiceStatus,
): BankTransfer | null {
  const { bankName, bankAccountNumber, bankAccountName } = company
  if (status === 'paid' || !bankName || !bankAccountNumber || !bankAccountName) return null
  return { bankName, accountNumber: bankAccountNumber, accountName: bankAccountName }
}

/** The instruction around the account number, which the document and PDF set in mono. */
export const TRANSFER_TEXT = {
  before: (bankName: string) => `Please transfer payment to ${bankName}, account number `,
  after: (accountName: string) => `, in the name of ${accountName}.`,
}

export function transferSentence({ bankName, accountNumber, accountName }: BankTransfer): string {
  return `${TRANSFER_TEXT.before(bankName)}${accountNumber}${TRANSFER_TEXT.after(accountName)}`
}
