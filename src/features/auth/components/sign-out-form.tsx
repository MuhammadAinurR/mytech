'use client'

import { type ReactNode, useTransition } from 'react'

import { logoutAction } from '@/features/auth/actions'
import { forgetThisDevice } from '@/features/notifications/lib/browser'

/**
 * Signs out, first forgetting this device's push subscription so reminders
 * stop arriving here for the account that just left. Without JavaScript the
 * plain form still signs out.
 */
export function SignOutForm({ children }: { children: ReactNode }) {
  const [, startTransition] = useTransition()
  return (
    <form
      action={logoutAction}
      onSubmit={(event) => {
        event.preventDefault()
        startTransition(async () => {
          await forgetThisDevice()
          await logoutAction()
        })
      }}
    >
      {children}
    </form>
  )
}
