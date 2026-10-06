import { describe, expect, it } from 'vitest'

import {
  computeTotals,
  formatInvoiceNumber,
  formatPercent,
  formatQuantity,
  lineTotal,
  parsePercent,
  parseQuantity,
} from './totals'

describe('lineTotal', () => {
  it('multiplies quantity (thousandths) by unit price with half-up rounding', () => {
    expect(lineTotal({ quantityMilli: 1000, unitPriceMinor: 12_500 })).toBe(12_500)
    expect(lineTotal({ quantityMilli: 1500, unitPriceMinor: 8_000 })).toBe(12_000)
    // 0.333 × 1.00 = 0.333 → 0.33
    expect(lineTotal({ quantityMilli: 333, unitPriceMinor: 100 })).toBe(33)
    // 0.005 × 1.00 = 0.005 → 0.01 (half up)
    expect(lineTotal({ quantityMilli: 5, unitPriceMinor: 100 })).toBe(1)
    // 2.5 × 0.03 = 0.075 → 0.08
    expect(lineTotal({ quantityMilli: 2500, unitPriceMinor: 3 })).toBe(8)
  })

  it('stays exact for large amounts', () => {
    // 1,000 units at 150,000,000 IDR each.
    expect(lineTotal({ quantityMilli: 1_000_000, unitPriceMinor: 150_000_000 })).toBe(
      150_000_000_000,
    )
  })
})

describe('computeTotals', () => {
  it('applies discount before tax', () => {
    expect(
      computeTotals({
        lines: [
          { quantityMilli: 1000, unitPriceMinor: 100_000 },
          { quantityMilli: 2000, unitPriceMinor: 2_500 },
        ],
        taxRateBps: 1100,
        discountMinor: 5_000,
      }),
    ).toEqual({
      lineTotals: [100_000, 5_000],
      subtotalMinor: 105_000,
      discountMinor: 5_000,
      taxableMinor: 100_000,
      taxMinor: 11_000,
      totalMinor: 111_000,
    })
  })

  it('rounds tax half up once on the taxable amount', () => {
    // 10.05 × 7.5% = 0.75375 → 0.75
    expect(
      computeTotals({
        lines: [{ quantityMilli: 1000, unitPriceMinor: 1005 }],
        taxRateBps: 750,
        discountMinor: 0,
      }).taxMinor,
    ).toBe(75)
    // 0.10 × 5% = 0.005 → 0.01
    expect(
      computeTotals({
        lines: [{ quantityMilli: 1000, unitPriceMinor: 10 }],
        taxRateBps: 500,
        discountMinor: 0,
      }).taxMinor,
    ).toBe(1)
  })

  it('caps the discount at the subtotal and never goes negative', () => {
    const totals = computeTotals({
      lines: [{ quantityMilli: 1000, unitPriceMinor: 1_000 }],
      taxRateBps: 1000,
      discountMinor: 5_000,
    })
    expect(totals).toMatchObject({
      discountMinor: 1_000,
      taxableMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    })
  })

  it('always satisfies total = subtotal − discount + tax', () => {
    for (let i = 0; i < 200; i++) {
      const lines = Array.from({ length: 1 + (i % 5) }, (_, j) => ({
        quantityMilli: 1 + ((i * 37 + j * 101) % 50_000),
        unitPriceMinor: (i * 7919 + j * 104_729) % 2_000_000,
      }))
      const t = computeTotals({
        lines,
        taxRateBps: (i * 13) % 2500,
        discountMinor: (i * 997) % 30_000,
      })
      expect(t.totalMinor).toBe(t.subtotalMinor - t.discountMinor + t.taxMinor)
      expect(t.subtotalMinor).toBe(t.lineTotals.reduce((a, b) => a + b, 0))
    }
  })
})

describe('parsing and formatting', () => {
  it.each([
    ['1', 1000],
    ['1.5', 1500],
    ['0.125', 125],
    ['2,000', 2_000_000],
    ['0', null],
    ['1.2345', null],
    ['-1', null],
    ['abc', null],
  ])('parseQuantity(%j) → %j', (input, expected) => {
    expect(parseQuantity(input)).toBe(expected)
  })

  it('formats quantities without trailing zeros', () => {
    expect(formatQuantity(1000)).toBe('1')
    expect(formatQuantity(1500)).toBe('1.5')
    expect(formatQuantity(125)).toBe('0.125')
  })

  it.each([
    ['11', 1100],
    ['7.25', 725],
    ['0', 0],
    ['100', 10_000],
    ['100.01', null],
    ['7.255', null],
    ['', null],
  ])('parsePercent(%j) → %j', (input, expected) => {
    expect(parsePercent(input)).toBe(expected)
  })

  it('formats percentages and invoice numbers', () => {
    expect(formatPercent(1100)).toBe('11')
    expect(formatPercent(725)).toBe('7.25')
    expect(formatPercent(1050)).toBe('10.5')
    expect(formatInvoiceNumber('INV-', 42)).toBe('INV-0042')
    expect(formatInvoiceNumber('2026/', 12345)).toBe('2026/12345')
  })
})
