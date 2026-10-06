import Image from 'next/image'

import { cn } from '@/lib/utils'

/** A company's uploaded logo, or its initial on a quiet square. */
export function CompanyLogo({
  company,
  size = 32,
  className,
}: {
  company: { id: string; name: string; hasLogo: boolean; logoUpdatedAt: Date | null }
  size?: 24 | 32 | 48
  className?: string
}) {
  const box = { 24: 'size-6 rounded-xs', 32: 'size-8 rounded-sm', 48: 'size-12 rounded-sm' }[size]
  if (company.hasLogo) {
    return (
      <Image
        // The route checks ownership, so the optimizer (which has no session) is bypassed.
        unoptimized
        src={`/api/companies/${company.id}/logo?v=${company.logoUpdatedAt?.getTime() ?? 0}`}
        alt={`${company.name} logo`}
        width={size}
        height={size}
        className={cn(box, 'shrink-0 border border-border bg-surface object-contain', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        box,
        'inline-flex shrink-0 items-center justify-center bg-fill-strong text-xs font-semibold text-muted',
        className,
      )}
    >
      {company.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
