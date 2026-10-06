'use client'

import { createContext, useContext, useId, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type FieldContextValue = {
  id: string
  describedBy: string | undefined
  invalid: boolean
  required: boolean
}

const FieldContext = createContext<FieldContextValue | null>(null)

/** Wires a control's id, aria-describedby, and aria-invalid to its Field. */
export function useFieldControl() {
  return useContext(FieldContext)
}

export type FieldProps = {
  label: ReactNode
  children: ReactNode
  /** Short guidance under the control. Replaced by the error while invalid. */
  hint?: ReactNode
  error?: string
  required?: boolean
  id?: string
  className?: string
  /** Visually hide the label (it stays available to assistive tech). */
  hideLabel?: boolean
}

export function Field({
  label,
  children,
  hint,
  error,
  required = false,
  id: idProp,
  className,
  hideLabel = false,
}: FieldProps) {
  const generatedId = useId()
  const id = idProp ?? generatedId
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <FieldContext
      value={{
        id,
        describedBy: message ? messageId : undefined,
        invalid: Boolean(error),
        required,
      }}
    >
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={id} className={cn('text-sm font-medium text-fg', hideLabel && 'sr-only')}>
          {label}
          {required ? null : (
            <span className="ml-1.5 font-normal text-subtle" aria-hidden>
              Optional
            </span>
          )}
        </label>
        {children}
        {message ? (
          <p
            id={messageId}
            className={cn('text-xs', error ? 'text-danger' : 'text-muted')}
            role={error ? 'alert' : undefined}
          >
            {message}
          </p>
        ) : null}
      </div>
    </FieldContext>
  )
}
