'use client'

import { Check } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { type ComponentProps, type ReactNode, useId } from 'react'

import { cn } from '@/lib/utils'

/** A 16px box on the control outline; checked fills with the accent. */
export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-xs border border-border-strong bg-surface text-accent-fg',
        'transition-[background-color,border-color] duration-150 ease-out hover:border-subtle',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        <Check aria-hidden className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/** A checkbox with its label to the right; the whole label toggles it. */
export function CheckboxField({
  label,
  hint,
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root> & { label: ReactNode; hint?: ReactNode }) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <Checkbox
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5"
        {...props}
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  )
}
