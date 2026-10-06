'use client'

import { useState, type FocusEvent, type FormEvent } from 'react'
import { type z } from 'zod'

import { type FieldErrors } from './result'
import { fieldErrors } from './validation'

/**
 * Inline validation for native forms that submit to a server action. Fields
 * validate on blur (and re-validate as you type once they have an error), and
 * submit is blocked while the form is invalid. The server validates again.
 */
export function useClientValidation(schema: z.ZodObject) {
  const [errors, setErrors] = useState<FieldErrors>({})

  function validate(form: HTMLFormElement) {
    const result = schema.safeParse(Object.fromEntries(new FormData(form)))
    return result.success ? {} : fieldErrors(result.error)
  }

  function validateField(form: HTMLFormElement | null, name: string) {
    if (!form || !(name in schema.shape)) return
    const fieldError = validate(form)[name]
    setErrors((current) => ({ ...current, [name]: fieldError }))
  }

  return {
    errors,
    onBlur(event: FocusEvent<HTMLFormElement>) {
      const control = asControl(event.target)
      if (control?.name && control.value !== '') validateField(event.currentTarget, control.name)
    },
    onChange(event: FormEvent<HTMLFormElement>) {
      const control = asControl(event.target)
      if (control?.name && errors[control.name]) validateField(event.currentTarget, control.name)
    },
    onSubmit(event: FormEvent<HTMLFormElement>) {
      const next = validate(event.currentTarget)
      if (Object.keys(next).length === 0) return
      event.preventDefault()
      setErrors(next)
      const first = Object.keys(next)[0]
      event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
    },
  }
}

function asControl(target: EventTarget) {
  return target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
    ? target
    : null
}
