'use client'

import { AlertDialog } from 'radix-ui'
import { useState, useTransition, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Button } from './button'
import { dialogSurfaceClasses, overlayClasses } from './dialog'

/**
 * Confirmation for destructive or irreversible actions. Focus starts on Cancel
 * so an accidental Enter never deletes anything.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
  open: openProp,
  onOpenChange,
}: {
  trigger?: ReactNode
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<unknown> | unknown
  destructive?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      {trigger ? <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger> : null}
      <AlertDialog.Portal>
        <AlertDialog.Overlay className={overlayClasses}>
          <AlertDialog.Content className={cn(dialogSurfaceClasses, 'max-w-sm')}>
            <div className="flex flex-col gap-1.5 px-6 pt-5 pb-5">
              <AlertDialog.Title className="text-md font-semibold">{title}</AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-muted">
                {description}
              </AlertDialog.Description>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Cancel</Button>
              </AlertDialog.Cancel>
              <Button
                variant={destructive ? 'danger' : 'primary'}
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    await onConfirm()
                    setOpen(false)
                  })
                }
              >
                {confirmLabel}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
