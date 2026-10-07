/**
 * Money is stored as an integer number of minor units (cents, sen, etc.) plus
 * an ISO 4217 code. These helpers convert between that representation and
 * human input/output without ever going through floating point.
 */

/**
 * Minor-unit exponent per supported currency. Pinned here rather than read
 * from Intl: stored amounts depend on it, so it must never change underneath
 * existing rows when ICU data updates. IDR uses whole rupiah (see ADR 0002).
 */
const EXPONENTS = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  SGD: 2,
  AUD: 2,
  IDR: 0,
  JPY: 0,
} as const satisfies Record<string, number>

export type CurrencyCode = keyof typeof EXPONENTS
export const CURRENCIES = Object.keys(EXPONENTS) as [CurrencyCode, ...CurrencyCode[]]

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(EXPONENTS, value)
}

/** Number of minor-unit digits for a currency (USD → 2, JPY → 0). */
export function currencyExponent(currency: string): number {
  if (!isCurrencyCode(currency)) throw new RangeError(`Unsupported currency: ${currency}`)
  return EXPONENTS[currency]
}

/** Exact decimal string for a minor-unit amount: 123456 USD → "1234.56". */
export function toDecimalString(amountMinor: number, currency: string): string {
  if (!Number.isSafeInteger(amountMinor)) throw new RangeError('Amount must be a safe integer')
  const exponent = currencyExponent(currency)
  const negative = amountMinor < 0
  const digits = Math.abs(amountMinor)
    .toString()
    .padStart(exponent + 1, '0')
  const whole = digits.slice(0, digits.length - exponent)
  const fraction = exponent > 0 ? `.${digits.slice(-exponent)}` : ''
  return `${negative ? '-' : ''}${whole}${fraction}`
}

/**
 * Parses user input such as "1,234.5" into minor units. Returns null for
 * anything that is not a plain non-negative decimal with at most the
 * currency's number of fraction digits.
 */
export function parseMoneyInput(input: string, currency: string): number | null {
  const cleaned = input.replace(/[\s,_]/g, '')
  const exponent = currencyExponent(currency)
  const pattern = exponent > 0 ? new RegExp(`^(\\d+)(?:\\.(\\d{0,${exponent}}))?$`) : /^(\d+)$/
  const match = cleaned.match(pattern)
  if (!match) return null
  const whole = match[1]!
  const fraction = (match[2] ?? '').padEnd(exponent, '0')
  const minor = Number(`${whole}${fraction}`)
  return Number.isSafeInteger(minor) ? minor : null
}

export type FormatMoneyOptions = {
  locale?: string
  /** "always" renders +/−, "exceptZero" hides the sign on zero. */
  signDisplay?: Intl.NumberFormatOptions['signDisplay']
  /** Hide the currency symbol, e.g. inside a column already labelled with it. */
  hideCurrency?: boolean
}

export function formatMoney(
  amountMinor: number,
  currency: string,
  { locale = 'en-US', signDisplay = 'auto', hideCurrency = false }: FormatMoneyOptions = {},
): string {
  const exponent = currencyExponent(currency)
  const formatter = new Intl.NumberFormat(locale, {
    style: hideCurrency ? 'decimal' : 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    signDisplay,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  })
  // Intl formats decimal strings exactly, so large amounts never lose precision.
  return formatter.format(toDecimalString(amountMinor, currency) as Intl.StringNumericLiteral)
}

/** Short form for chart axes and tight spaces: $5K, Rp 15M, −$1.2K. */
export function formatMoneyCompact(
  amountMinor: number,
  currency: string,
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(toDecimalString(amountMinor, currency) as Intl.StringNumericLiteral)
    .replace(/^-/, '\u2212')
}
