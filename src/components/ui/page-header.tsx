import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

import { type BackTarget, MobileTitleBar } from '@/components/app-shell/mobile-title-bar'
import { cn } from '@/lib/utils'

/**
 * A page's title, description, and actions. On mobile (DESIGN.md → Mobile)
 * the title becomes a large title under the floating glass title bar:
 * `mobileActions` (glass circles) replace `actions` there when given, and the
 * description shows only with `descriptionOnMobile` (when it carries data).
 */
export function PageHeader({
  title,
  description,
  actions,
  mobileActions,
  back,
  descriptionOnMobile = false,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  mobileActions?: ReactNode
  back?: BackTarget
  descriptionOnMobile?: boolean
  className?: string
}) {
  return (
    <>
      {back && !back.mobileOnly ? (
        <div className="px-(--gutter) pt-6 max-md:hidden">
          <Link
            href={back.href}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            {back.label}
          </Link>
        </div>
      ) : null}
      <header
        className={cn(
          'flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-(--gutter) pt-8 pb-6',
          back && !back.mobileOnly && 'md:pt-3',
          'max-md:pt-(--title-top) max-md:pb-5',
          className,
        )}
      >
        <MobileTitleBar back={back} actions={mobileActions} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-lg font-semibold text-fg max-md:text-xl max-md:tracking-[-0.02em]">
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                'text-sm text-pretty text-muted',
                !descriptionOnMobile && 'max-md:hidden',
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className={cn('flex items-center gap-2', mobileActions && 'max-md:hidden')}>
            {actions}
          </div>
        ) : null}
      </header>
    </>
  )
}
