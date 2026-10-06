'use client'

import { Plus } from 'lucide-react'
import { createContext, useContext, type ReactNode } from 'react'

import { useEntityDialog } from '@/components/use-entity-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import type { CredentialItem } from '@/server/queries/credentials'

import { CredentialForm } from './credential-form'

const CredentialDialogContext = createContext<{
  openCreate: () => void
  openEdit: (item: CredentialItem) => void
} | null>(null)

export function useCredentialDialog() {
  const context = useContext(CredentialDialogContext)
  if (!context) throw new Error('useCredentialDialog must be used inside its provider')
  return context
}

export function CredentialDialogProvider({ children }: { children: ReactNode }) {
  const dialog = useEntityDialog<CredentialItem>()
  const item = dialog.item

  return (
    <CredentialDialogContext value={dialog}>
      {children}
      <Dialog open={dialog.open} onOpenChange={(open) => (open ? null : dialog.close())}>
        <DialogContent size="md">
          <DialogHeader
            title={item ? 'Edit credential' : 'New credential'}
            description={item ? undefined : 'The secret is encrypted before it is stored.'}
          />
          <CredentialForm
            key={item?.id ?? 'new'}
            credentialId={item?.id}
            defaultValues={{
              label: item?.label ?? '',
              type: item?.type ?? 'server',
              host: item?.host ?? '',
              username: item?.username ?? '',
              notes: item?.notes ?? '',
              secret: '',
            }}
            onDone={dialog.close}
          />
        </DialogContent>
      </Dialog>
    </CredentialDialogContext>
  )
}

export function AddCredentialButton({
  variant = 'primary',
}: {
  variant?: 'primary' | 'secondary'
}) {
  const { openCreate } = useCredentialDialog()
  return (
    <Button variant={variant} size={variant === 'primary' ? 'md' : 'sm'} onClick={openCreate}>
      <Plus />
      Add credential
    </Button>
  )
}
