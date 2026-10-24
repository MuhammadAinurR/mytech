import { describe, expect, it } from 'vitest'

import { bankTransfer, transferSentence } from './payment'

const bni = {
  bankName: 'BNI',
  bankAccountNumber: '123-456-7890',
  bankAccountName: 'PT Studio Example',
}
const transfer = {
  bankName: 'BNI',
  accountNumber: '123-456-7890',
  accountName: 'PT Studio Example',
}

describe('bankTransfer', () => {
  it('asks drafts and sent invoices to be paid into the company’s account', () => {
    for (const status of ['draft', 'sent'] as const) {
      expect(bankTransfer(bni, status)).toEqual(transfer)
    }
  })

  it('leaves it out once paid, or when the bank details are incomplete', () => {
    expect(bankTransfer(bni, 'paid')).toBeNull()
    expect(
      bankTransfer({ bankName: null, bankAccountNumber: null, bankAccountName: null }, 'sent'),
    ).toBeNull()
    expect(bankTransfer({ ...bni, bankAccountName: null }, 'sent')).toBeNull()
  })
})

describe('transferSentence', () => {
  it('reads as one plain instruction with the bank, number, and name on the account', () => {
    expect(transferSentence(transfer)).toBe(
      'Please transfer payment to BNI, account number 123-456-7890, in the name of PT Studio Example.',
    )
  })
})
