'use client'

import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { type ComponentProps, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
} as const

export const overlayClasses = cn(
  'fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-scrim p-4',
  'data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in',
)

export const dialogSurfaceClasses = cn(
  'relative w-full rounded-lg bg-surface-raised text-fg shadow-dialog outline-none',
  'data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in',
)

export function DialogContent({
  className,
  children,
  size = 'md',
  hideClose = false,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  size?: keyof typeof widths
  hideClose?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={overlayClasses}>
        <DialogPrimitive.Content
          className={cn(dialogSurfaceClasses, widths[size], className)}
          {...props}
        >
          {children}
          {hideClose ? null : (
            <DialogPrimitive.Close
              className="absolute top-4 right-4 inline-flex size-7 cursor-pointer items-center justify-center rounded-sm text-subtle transition-colors hover:bg-fill hover:text-fg"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({
  title,
  description,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1 px-6 pt-5 pr-14', className)}>
      <DialogPrimitive.Title className="text-md font-semibold">{title}</DialogPrimitive.Title>
      {description ? (
        <DialogPrimitive.Description className="text-sm text-muted">
          {description}
        </DialogPrimitive.Description>
      ) : (
        <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
      )}
    </div>
  )
}

export function DialogBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-6 py-5', className)} {...props} />
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}
