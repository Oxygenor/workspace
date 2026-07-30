import { type ClassValue, clsx } from 'clsx'
import type { MouseEvent } from 'react'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Opens the native date/time picker on click anywhere in the field, not just the small icon. */
export function openDatePicker(e: MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    // Unsupported browser or input not focusable — clicking the native icon still works.
  }
}
