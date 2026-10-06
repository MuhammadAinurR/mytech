import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge about our token names so conflicting classes resolve
// correctly (e.g. `shadow-popover` is a shadow, not a shadow color).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      shadow: ['popover', 'dialog', 'drag'],
      animate: [
        'fade-in',
        'fade-out',
        'pop-in',
        'pop-out',
        'dialog-in',
        'dialog-out',
        'sheet-in',
        'sheet-out',
        'shimmer',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
