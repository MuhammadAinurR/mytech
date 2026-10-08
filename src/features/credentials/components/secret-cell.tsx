'use client'

import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toaster'
import { Popover, PopoverAnchor, PopoverContent, Tooltip } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/lib/use-media-query'

import { revealSecretAction } from '../actions'

const REVEAL_SECONDS = 20

const errors = {
  rate_limited: 'Too many reveals in a short time. Wait a few minutes.',
  not_found: 'That credential no longer exists.',
  unavailable: 'This secret can’t be decrypted. Check the encryption keys.',
} as const

/**
 * Masked secret with reveal and copy. Each action fetches the secret through
 * the audited server action; nothing is held in the page until requested,
 * and a revealed secret hides itself again after 20 seconds.
 */
export function SecretCell({ credentialId, label }: { credentialId: string; label: string }) {
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revealing, startReveal] = useTransition()
  const [copying, startCopy] = useTransition()
  // Narrow screens show the revealed secret in a popover instead of inline.
  const wide = useMediaQuery('(min-width: 40rem)', true)

  useEffect(() => {
    if (secret === null) return
    const timer = setTimeout(() => setSecret(null), REVEAL_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [secret])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  function reveal() {
    if (secret !== null) return setSecret(null)
    startReveal(async () => {
      const result = await revealSecretAction(credentialId, 'reveal')
      if (result.ok) setSecret(result.data.secret)
      else toast.error(errors[result.error])
    })
  }

  function copy() {
    startCopy(async () => {
      const result = await revealSecretAction(credentialId, 'copy')
      if (!result.ok) return void toast.error(errors[result.error])
      try {
        await navigator.clipboard.writeText(result.data.secret)
        setCopied(true)
        toast.success('Secret copied')
      } catch {
        toast.error('Your browser blocked clipboard access.')
      }
    })
  }

  const masked = <span className="tracking-wide text-subtle">••••••••••••</span>

  return (
    <Popover
      open={!wide && secret !== null}
      onOpenChange={(open) => (open ? null : setSecret(null))}
    >
      <div className="flex min-w-0 items-center justify-end gap-1 sm:justify-start">
        <span
          className="hidden min-w-0 flex-1 truncate font-mono text-sm sm:block"
          aria-live="polite"
          aria-label={secret === null ? 'Secret hidden' : `Secret for ${label}`}
        >
          {secret === null || !wide ? masked : secret}
        </span>
        <PopoverAnchor asChild>
          <span>
            <Tooltip content={secret === null ? 'Reveal for 20 seconds' : 'Hide'}>
              <Button
                size="icon-sm"
                variant="ghost"
                className="max-md:size-10"
                onClick={reveal}
                aria-label={
                  secret === null ? `Reveal secret for ${label}` : `Hide secret for ${label}`
                }
                aria-pressed={secret !== null}
              >
                {revealing ? <Spinner /> : secret === null ? <Eye /> : <EyeOff />}
              </Button>
            </Tooltip>
          </span>
        </PopoverAnchor>
        <Tooltip content="Copy secret">
          <Button
            size="icon-sm"
            variant="ghost"
            className="max-md:size-10"
            onClick={copy}
            aria-label={`Copy secret for ${label}`}
          >
            {copying ? <Spinner /> : copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </Tooltip>
      </div>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="text-xs text-muted">{label}</p>
        <p className="mt-1 font-mono text-sm break-all select-all">{secret}</p>
      </PopoverContent>
    </Popover>
  )
}
