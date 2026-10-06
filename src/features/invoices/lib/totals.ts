/**
 * Invoice arithmetic on integers only. Quantities are thousandths, prices and
 * totals are minor units, tax rates are basis points. Rounding is half up
 * (amounts here are never negative), applied once per line and once for tax.
 */

export type LineInput = { quantityMilli: number; unitPriceMinor: number }

export type InvoiceTotals = {
  lineTotals: number[]
  subtotalMinor: number
  discountMinor: number
  taxableMinor: number
  taxMinor: number
  totalMinor: number
}

/** round(numerator / denominator), half up, for non-negative BigInts. */
function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * 2n + denominator) / (denominator * 2n)
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Amount is too large')
  return Number(value)
}

export function lineTotal({ quantityMilli, unitPriceMinor }: LineInput): number {
  if (quantityMilli < 0 || unitPriceMinor < 0) throw new RangeError('Negative line values')
  return toSafeNumber(divideHalfUp(BigInt(quantityMilli) * BigInt(unitPriceMinor), 1000n))
}

export function computeTotals({
  lines,
  taxRateBps,
  discountMinor,
}: {
  lines: LineInput[]
  taxRateBps: number
  discountMinor: number
}): InvoiceTotals {
  const lineTotals = lines.map(lineTotal)
  const subtotal = lineTotals.reduce((sum, value) => sum + BigInt(value), 0n)
  const discount =
    BigInt(Math.max(0, discountMinor)) > subtotal ? subtotal : BigInt(Math.max(0, discountMinor))
  const taxable = subtotal - discount
  const tax = divideHalfUp(taxable * BigInt(taxRateBps), 10_000n)
  return {
    lineTotals,
    subtotalMinor: toSafeNumber(subtotal),
    discountMinor: toSafeNumber(discount),
    taxableMinor: toSafeNumber(taxable),
    taxMinor: toSafeNumber(tax),
    totalMinor: toSafeNumber(taxable + tax),
  }
}

/** "1.5" → 1500 thousandths; null for anything but a positive number with ≤ 3 decimals. */
export function parseQuantity(input: string): number | null {
  const match = /^(\d{1,7})(?:\.(\d{1,3}))?$/.exec(input.trim().replace(/,/g, ''))
  if (!match) return null
  const value = Number(match[1]) * 1000 + Number((match[2] ?? '').padEnd(3, '0'))
  return value > 0 ? value : null
}

export function formatQuantity(quantityMilli: number): string {
  const whole = Math.floor(quantityMilli / 1000)
  const fraction = String(quantityMilli % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : String(whole)
}

/** "11" → 1100 bps, "7.25" → 725; null outside 0–100 or past 2 decimals. */
export function parsePercent(input: string): number | null {
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(input.trim())
  if (!match) return null
  const bps = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return bps <= 10_000 ? bps : null
}

export function formatPercent(bps: number): string {
  const whole = Math.floor(bps / 100)
  const fraction = String(bps % 100)
    .padStart(2, '0')
    .replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : String(whole)
}

export function formatInvoiceNumber(prefix: string, number: number): string {
  return `${prefix}${String(number).padStart(4, '0')}`
}
