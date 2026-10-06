import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

import { Spinner } from './spinner'

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap select-none',
    'rounded-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-out',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress aria-busy:opacity-100',
    '[&_svg]:size-4',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'border border-border-strong bg-surface text-fg hover:bg-fill',
        ghost: 'text-muted hover:bg-fill hover:text-fg',
        danger: 'bg-danger text-accent-fg hover:bg-danger/90',
        'danger-ghost': 'text-danger hover:bg-danger-soft',
        link: 'h-auto px-0 text-accent underline-offset-4 hover:underline active:translate-y-0',
      },
      size: {
        sm: 'h-7 px-2.5 text-sm',
        md: 'h-8 px-3 text-sm',
        lg: 'h-9 px-4 text-base',
        icon: 'size-8',
        'icon-sm': 'size-7',
      },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Shows a spinner, keeps the width stable, and blocks further clicks. */
    loading?: boolean
  }

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)

  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <span className="inline-flex items-center gap-1.5 opacity-0">{children}</span>
          <span className="absolute inset-0 inline-flex items-center justify-center">
            <Spinner />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
