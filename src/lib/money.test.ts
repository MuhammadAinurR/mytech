import { describe, expect, it } from 'vitest'

import {
  currencyExponent,
  formatMoney,
  isCurrencyCode,
  parseMoneyInput,
  toDecimalString,
} from './money'

describe('currencyExponent', () => {
  it('follows ISO 4217 minor units', () => {
    expect(currencyExponent('USD')).toBe(2)
    expect(currencyExponent('JPY')).toBe(0)
    expect(currencyExponent('IDR')).toBe(0)
  })

  it('rejects unsupported currencies', () => {
    expect(() => currencyExponent('XYZ')).toThrow(RangeError)
  })
})

describe('toDecimalString', () => {
  it('renders exact decimals', () => {
    expect(toDecimalString(123456, 'USD')).toBe('1234.56')
    expect(toDecimalString(5, 'USD')).toBe('0.05')
    expect(toDecimalString(-5, 'USD')).toBe('-0.05')
    expect(toDecimalString(0, 'USD')).toBe('0.00')
    expect(toDecimalString(1500, 'JPY')).toBe('1500')
  })

  it('handles amounts beyond float-safe decimal arithmetic', () => {
    // Near Number.MAX_SAFE_INTEGER: dividing as a float would drift.
    expect(toDecimalString(9_000_000_000_000_001, 'USD')).toBe('90000000000000.01')
  })

  it('rejects non-integers', () => {
    expect(() => toDecimalString(1.5, 'USD')).toThrow(RangeError)
  })
})

describe('parseMoneyInput', () => {
  it.each([
    ['12', 1200],
    ['12.3', 1230],
    ['12.34', 1234],
    ['1,234.56', 123456],
    [' 1 000 ', 100000],
    ['0.01', 1],
    ['.5', null],
    ['12.345', null],
    ['-3', null],
    ['1e3', null],
    ['', null],
    ['abc', null],
  ])('parses %j as %j (USD)', (input, expected) => {
    expect(parseMoneyInput(input, 'USD')).toBe(expected)
  })

  it('rejects fractions for zero-decimal currencies', () => {
    expect(parseMoneyInput('1500', 'JPY')).toBe(1500)
    expect(parseMoneyInput('1500.5', 'JPY')).toBeNull()
  })

  it('round-trips with toDecimalString', () => {
    for (const minor of [0, 1, 99, 100, 123456789]) {
      expect(parseMoneyInput(toDecimalString(minor, 'EUR'), 'EUR')).toBe(minor)
    }
  })
})

describe('formatMoney', () => {
  it('formats with symbol and fixed fraction digits', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56')
    expect(formatMoney(1500, 'JPY')).toBe('¥1,500')
    expect(formatMoney(-990, 'EUR')).toBe('-€9.90')
    expect(formatMoney(15_000_000, 'IDR')).toBe('Rp\u00a015,000,000')
  })

  it('can force a sign or hide the currency', () => {
    expect(formatMoney(1000, 'USD', { signDisplay: 'always' })).toBe('+$10.00')
    expect(formatMoney(1000, 'USD', { hideCurrency: true })).toBe('10.00')
  })
})

describe('isCurrencyCode', () => {
  it('only accepts supported codes', () => {
    expect(isCurrencyCode('USD')).toBe(true)
    expect(isCurrencyCode('usd')).toBe(false)
    expect(isCurrencyCode('XYZ')).toBe(false)
  })
})
