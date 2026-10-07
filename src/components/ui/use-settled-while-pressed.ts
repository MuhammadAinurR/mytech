'use client'

import { useState, useSyncExternalStore } from 'react'

let pressed = false
const listeners = new Set<() => void>()

function setPressed(next: boolean) {
  if (pressed === next) return
  pressed = next
  for (const listener of listeners) listener()
}

const onPointerDown = () => setPressed(true)
// After the click that follows pointerup has been dispatched.
const onPointerUp = () => setTimeout(() => setPressed(false), 0)

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerUp, true)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size > 0) return
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('pointerup', onPointerUp, true)
    document.removeEventListener('pointercancel', onPointerUp, true)
    pressed = false
  }
}

/**
 * `value`, held at what it was while a pointer button is down.
 *
 * For content that changes layout, like validation messages. Pressing a button
 * blurs the focused field, and validating on blur adds a message above the
 * button. If that moves the button out from under the pointer before it's
 * released, the click lands on something else and is lost. Holding the
 * message until release lets the click finish first.
 */
export function useSettledWhilePressed<T>(value: T): T {
  const isPressed = useSyncExternalStore(
    subscribe,
    () => pressed,
    () => false,
  )
  const [settled, setSettled] = useState(value)
  if (!isPressed && settled !== value) setSettled(value)
  return isPressed ? settled : value
}
