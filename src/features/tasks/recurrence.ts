import type { TaskRecurrence } from '@/types/database'

/** Parses a `YYYY-MM-DD`-prefixed date string as a local calendar date (ignoring any time/zone suffix). */
function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Computes the next occurrence for a recurring task: current `due_date` if set, else today,
 * advanced by the recurrence interval (daily/weekly/+1 calendar month).
 */
export function nextOccurrenceDate(recurrence: TaskRecurrence, currentDueDate: string | null): Date {
  const base = currentDueDate ? parseDateOnly(currentDueDate) : new Date()
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate())

  if (recurrence === 'daily') next.setDate(next.getDate() + 1)
  else if (recurrence === 'weekly') next.setDate(next.getDate() + 7)
  else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1)

  return next
}
