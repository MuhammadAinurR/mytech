'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Input, type InputProps } from '@/components/ui/input'

export function PasswordInput(props: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-10" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 inline-flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xs text-subtle transition-colors hover:text-fg"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
