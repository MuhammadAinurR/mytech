'use client'

import { ChevronDown } from 'lucide-react'
import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'

import { useFieldControl } from './field'

export const controlClasses = cn(
  'w-full min-w-0 rounded-sm border border-border-strong bg-surface text-sm text-fg',
  'transition-[border-color,outline-color] duration-150 ease-out',
  'placeholder:text-subtle hover:border-subtle',
  'focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-soft',
  'aria-invalid:border-danger aria-invalid:focus-visible:outline-danger-soft',
  'disabled:cursor-not-allowed disabled:bg-fill disabled:text-muted disabled:hover:border-border-strong',
)

function useControlProps<T extends { id?: string; 'aria-describedby'?: string }>(props: T) {
  const field = useFieldControl()
  return {
    id: props.id ?? field?.id,
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
    'aria-invalid': field?.invalid || undefined,
    required: field?.required || undefined,
  }
}

export type InputProps = Omit<ComponentProps<'input'>, 'size'> & { size?: 'md' | 'lg' }

export function Input({ className, size = 'md', ...props }: InputProps) {
  const control = useControlProps(props)
  return (
    <input
      {...control}
      {...props}
      className={cn(controlClasses, size === 'lg' ? 'h-9 px-3' : 'h-8 px-2.5', className)}
    />
  )
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  const control = useControlProps(props)
  return (
    <textarea
      rows={3}
      {...control}
      {...props}
      className={cn(controlClasses, 'min-h-20 resize-y px-2.5 py-1.5 leading-normal', className)}
    />
  )
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  const control = useControlProps(props)
  return (
    <div className="relative w-full">
      <select
        {...control}
        {...props}
        className={cn(controlClasses, 'h-8 cursor-pointer appearance-none pr-8 pl-2.5', className)}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-subtle"
      />
    </div>
  )
}
