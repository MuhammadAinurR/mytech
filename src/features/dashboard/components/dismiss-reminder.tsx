'use client'

import { X } from 'lucide-react'
import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { dismissReminderAction } from '@/features/recurring/actions'

export function DismissReminder({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={`Dismiss reminder for ${label}`}
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await dismissReminderAction(id)
          if (!result.ok) toast.error('That reminder was already dismissed.')
        })
      }
    >
      <X />
    </Button>
  )
}
