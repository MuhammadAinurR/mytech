import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

/**
 * A money figure: tabular numerals, exact formatting from minor units. Income
 * may be marked with the success tone; everything else stays neutral.
 */
export function Money({
  amountMinor,
  currency,
  signed = false,
  tone = 'neutral',
  className,
}: {
  amountMinor: number
  currency: string
  /** Prefix + or − explicitly. */
  signed?: boolean
  tone?: 'neutral' | 'positive' | 'muted'
  className?: string
}) {
  return (
    <span
      className={cn(
        'tabular',
        tone === 'positive' && 'text-success',
        tone === 'muted' && 'text-muted',
        className,
      )}
    >
      {formatMoney(amountMinor, currency, {
        signDisplay: signed ? 'exceptZero' : 'auto',
      }).replace(/^-/, '\u2212')}
    </span>
  )
}
