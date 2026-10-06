'use client'

import { Upload } from 'lucide-react'
import { useRef, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'

import { removeCompanyLogoAction, uploadCompanyLogoAction } from '../actions'
import { CompanyLogo } from './company-logo'

const messages = {
  invalid_file: 'Use a PNG, JPEG, or WebP image.',
  too_large: 'Use an image under 512 KB.',
  not_found: 'That company no longer exists.',
} as const

export function LogoUploader({
  company,
}: {
  company: { id: string; name: string; hasLogo: boolean; logoUpdatedAt: Date | null }
}) {
  const input = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()

  function upload(file: File) {
    const data = new FormData()
    data.set('logo', file)
    startTransition(async () => {
      const result = await uploadCompanyLogoAction(company.id, data)
      if (result.ok) toast.success('Logo updated')
      else toast.error(messages[result.error])
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCompanyLogoAction(company.id)
      if (result.ok) toast.success('Logo removed')
      else toast.error(messages[result.error])
    })
  }

  return (
    <div className="flex items-center gap-4">
      <CompanyLogo company={company} size={48} />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Button size="sm" loading={pending} onClick={() => input.current?.click()}>
            <Upload />
            {company.hasLogo ? 'Replace logo' : 'Upload logo'}
          </Button>
          {company.hasLogo ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted">PNG, JPEG, or WebP, up to 512 KB. Shown on invoices.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) upload(file)
        }}
      />
    </div>
  )
}
