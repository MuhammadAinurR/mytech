'use client'

import { ArrowDown, ArrowUp, Ellipsis, FileText, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InsetActionRow, InsetSection } from '@/components/ui/inset-list'
import { toast } from '@/components/ui/toaster'
import { Tooltip } from '@/components/ui/tooltip'

import { deleteInvoiceAttachmentAction, moveInvoiceAttachmentAction } from '../actions'
import {
  ATTACHMENT_UPLOAD_MESSAGES,
  type AttachmentUploadError,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '../lib/attachments'

export type AttachmentItem = { id: string; fileName: string; sizeBytes: number; pageCount: number }

const pages = (count: number) => `${count} ${count === 1 ? 'page' : 'pages'}`

/** Saves a file the route sends as a download, without leaving the page. */
function download(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = ''
  link.click()
}

/** Uploads one file; returns why it failed, or null. */
async function uploadOne(invoiceId: string, file: File): Promise<string | null> {
  // Checked here too, so a too-big file fails at once instead of after uploading.
  if (file.size > MAX_ATTACHMENT_BYTES) return ATTACHMENT_UPLOAD_MESSAGES.file_too_large
  const body = new FormData()
  body.set('file', file)
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/attachments`, { method: 'POST', body })
    if (response.ok) return null
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    const code = data?.error
    return code && code in ATTACHMENT_UPLOAD_MESSAGES
      ? ATTACHMENT_UPLOAD_MESSAGES[code as AttachmentUploadError]
      : 'The file wasn’t attached. Try again.'
  } catch {
    return 'The upload didn’t reach the server. Check your connection and try again.'
  }
}

/**
 * Third-party PDFs (a server or cloud provider's invoice) that the PDF download
 * adds after this invoice, in the order shown. Nothing here changes while a
 * change is in flight, so server data never overwrites one.
 */
export function InvoiceAttachments({
  invoiceId,
  attachments,
}: {
  invoiceId: string
  attachments: AttachmentItem[]
}) {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [removing, setRemoving] = useState<AttachmentItem | null>(null)
  const busy = uploading !== null || pending
  const total = attachments.reduce((sum, item) => sum + item.sizeBytes, 0)
  const full = attachments.length >= MAX_ATTACHMENTS

  async function attach(files: File[]) {
    let attached = 0
    for (const file of files) {
      setUploading(file.name)
      const error = await uploadOne(invoiceId, file)
      if (error) toast.error(`${file.name} wasn’t attached`, { description: error })
      else attached++
    }
    setUploading(null)
    if (attached === 0) return
    toast.success(
      attached === 1 && files.length === 1
        ? `Attached ${files[0]!.name}`
        : `${attached} PDFs attached`,
    )
    router.refresh()
  }

  function move(item: AttachmentItem, direction: 'up' | 'down') {
    startTransition(async () => {
      const result = await moveInvoiceAttachmentAction(invoiceId, item.id, direction)
      if (!result.ok) toast.error('The order wasn’t changed. Reload the page and try again.')
    })
  }

  return (
    <section aria-labelledby="attachments-title" className="mx-auto max-w-3xl pt-8 pb-10 sm:pb-0">
      <div className="flex items-end justify-between gap-4 px-4 pb-3 sm:px-0">
        <div className="min-w-0">
          <h2 id="attachments-title" className="text-md font-semibold">
            Attachments
          </h2>
          <p className="text-sm text-pretty text-muted">
            Third-party PDFs added after the invoice in the PDF download, in this order.
          </p>
        </div>
        <Button
          className="shrink-0"
          loading={uploading !== null}
          disabled={busy || full}
          onClick={() => input.current?.click()}
        >
          <Upload />
          Add PDF
        </Button>
      </div>

      {attachments.length === 0 ? (
        <p className="px-4 text-sm text-muted sm:px-0">
          Nothing attached. Add a supplier’s PDF, such as a server or cloud invoice, to send it
          after this one.
        </p>
      ) : (
        <InsetSection
          className="px-4 md:px-0"
          footer={
            <>
              {attachments.length} of {MAX_ATTACHMENTS} · {formatFileSize(total)} of{' '}
              {formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)}. PDF only, up to{' '}
              {formatFileSize(MAX_ATTACHMENT_BYTES)} each.
            </>
          }
        >
          {attachments.map((item, index) => (
            <InsetActionRow
              key={item.id}
              icon={<FileText />}
              title={item.fileName}
              subtitle={
                <span className="tabular">
                  {pages(item.pageCount)} · {formatFileSize(item.sizeBytes)}
                </span>
              }
              onOpen={() => download(`/api/invoices/${invoiceId}/attachments/${item.id}`)}
              controls={
                <>
                  {/* Wider screens: quiet until hover or focus; always shown for touch. */}
                  <span className="hidden items-center opacity-0 transition-opacity duration-150 group-focus-within/row:opacity-100 group-hover/row:opacity-100 md:flex pointer-coarse:opacity-100">
                    <RowButton
                      label={`Move ${item.fileName} up`}
                      tip="Move up"
                      disabled={busy || index === 0}
                      onClick={() => move(item, 'up')}
                    >
                      <ArrowUp />
                    </RowButton>
                    <RowButton
                      label={`Move ${item.fileName} down`}
                      tip="Move down"
                      disabled={busy || index === attachments.length - 1}
                      onClick={() => move(item, 'down')}
                    >
                      <ArrowDown />
                    </RowButton>
                    <RowButton
                      label={`Remove ${item.fileName}`}
                      tip="Remove"
                      disabled={busy}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2 />
                    </RowButton>
                  </span>
                  {/* Phones: one menu, so the file name keeps the room. */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="size-10 md:hidden"
                        aria-label={`Actions for ${item.fileName}`}
                        disabled={busy}
                      >
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={index === 0} onSelect={() => move(item, 'up')}>
                        <ArrowUp />
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={index === attachments.length - 1}
                        onSelect={() => move(item, 'down')}
                      >
                        <ArrowDown />
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem tone="danger" onSelect={() => setRemoving(item)}>
                        <Trash2 />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              }
            />
          ))}
        </InsetSection>
      )}

      <p role="status" className="px-4 pt-2 text-xs text-muted empty:hidden sm:px-0">
        {uploading ? `Attaching ${uploading}…` : ''}
      </p>

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length > 0) void attach(files)
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.fileName ?? 'attachment'}?`}
        description="It’s taken out of this invoice’s PDF and deleted."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          if (!removing) return
          const result = await deleteInvoiceAttachmentAction(invoiceId, removing.id)
          if (result.ok) toast.success(`Removed ${removing.fileName}`)
          else toast.error('That attachment was already removed.')
          setRemoving(null)
        }}
      />
    </section>
  )
}

function RowButton({
  label,
  tip,
  disabled,
  onClick,
  children,
}: {
  label: string
  tip: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip content={tip}>
      <Button
        size="icon-sm"
        variant="ghost"
        className="max-md:size-10"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        {children}
      </Button>
    </Tooltip>
  )
}
