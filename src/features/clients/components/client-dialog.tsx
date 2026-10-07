'use client'

import { Plus } from 'lucide-react'
import { createContext, useContext, type ReactNode } from 'react'

import { useEntityDialog } from '@/components/use-entity-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
import type { Client } from '@/server/queries/clients'

import { ClientForm } from './client-form'

const ClientDialogContext = createContext<{
  openCreate: () => void
  openEdit: (client: Client) => void
} | null>(null)

export function useClientDialog() {
  const context = useContext(ClientDialogContext)
  if (!context) throw new Error('useClientDialog must be used inside its provider')
  return context
}

/** Add and edit one company's saved clients. `?new=1` opens "New client". */
export function ClientDialogProvider({
  children,
  companyId,
  companyName,
}: {
  children: ReactNode
  companyId: string
  companyName: string
}) {
  const dialog = useEntityDialog<Client>()
  const client = dialog.item

  return (
    <ClientDialogContext value={dialog}>
      {children}
      <Dialog open={dialog.open} onOpenChange={(open) => (open ? null : dialog.close())}>
        <DialogContent>
          <DialogHeader
            title={client ? 'Edit client' : 'New client'}
            description={
              client
                ? 'Invoices already issued keep the details they were issued with.'
                : `Pick them on new invoices from ${companyName} instead of typing their details.`
            }
          />
          <ClientForm
            key={client?.id ?? 'new'}
            companyId={companyId}
            clientId={client?.id}
            defaultValues={{
              name: client?.name ?? '',
              address: client?.address ?? '',
              email: client?.email ?? '',
              taxId: client?.taxId ?? '',
            }}
            onDone={dialog.close}
          />
        </DialogContent>
      </Dialog>
    </ClientDialogContext>
  )
}

export function AddClientButton({ variant = 'secondary' }: { variant?: 'secondary' | 'ghost' }) {
  const { openCreate } = useClientDialog()
  return (
    <Button variant={variant} size="sm" onClick={openCreate}>
      <Plus />
      Add client
    </Button>
  )
}
