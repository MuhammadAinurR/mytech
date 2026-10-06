import { describe, expect, it } from 'vitest'

import { transactionInputSchema, transactionListQuerySchema } from './schema'

const base = {
  type: 'expense',
  amount: '12.49',
  currency: 'USD',
  category: ' Hosting ',
  occurredOn: '2026-10-04',
  note: '',
}

describe('transactionInputSchema', () => {
  it('turns form input into minor units with a null empty note', () => {
    expect(transactionInputSchema.parse(base)).toEqual({
      type: 'expense',
      amountMinor: 1249,
      currency: 'USD',
      category: 'Hosting',
      occurredOn: '2026-10-04',
      note: null,
    })
  })

  it('respects each currency’s minor units', () => {
    expect(
      transactionInputSchema.parse({ ...base, amount: '1,500', currency: 'JPY' }).amountMinor,
    ).toBe(1500)
    expect(
      transactionInputSchema.safeParse({ ...base, amount: '15.5', currency: 'IDR' }).success,
    ).toBe(false)
  })

  it.each([
    ['0', 'Enter an amount greater than zero.'],
    ['-5', 'Enter an amount like 1250 or 1,250.00.'],
    ['12.345', 'Enter an amount like 1250 or 1,250.00.'],
    ['', 'Enter an amount.'],
  ])('rejects amount %j', (amount, message) => {
    const result = transactionInputSchema.safeParse({ ...base, amount })
    expect(result.success).toBe(false)
    expect(result.error?.issues.find((i) => i.path[0] === 'amount')?.message).toBe(message)
  })

  it('rejects impossible dates and unknown currencies', () => {
    expect(transactionInputSchema.safeParse({ ...base, occurredOn: '2026-02-30' }).success).toBe(
      false,
    )
    expect(transactionInputSchema.safeParse({ ...base, currency: 'BTC' }).success).toBe(false)
  })
})

describe('transactionListQuerySchema', () => {
  it('keeps valid params and drops invalid ones instead of failing', () => {
    expect(
      transactionListQuerySchema.parse({ month: '2026-10', type: 'income', q: ' vps ', page: '3' }),
    ).toEqual({ month: '2026-10', type: 'income', q: 'vps', page: 3 })
    expect(
      transactionListQuerySchema.parse({ month: '2026-13', type: 'refund', page: '-2' }),
    ).toEqual({ month: undefined, type: undefined, q: undefined, page: 1 })
    expect(transactionListQuerySchema.parse({ page: ['2', '9'] }).page).toBe(2)
  })
})
