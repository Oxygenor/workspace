import { format, parseISO } from 'date-fns'

import { t } from '@/i18n'
import type { DeadlineCard, DeadlineTask } from './api'
import type { DeadlineItem } from './types'

export function buildDeadlineItems(cards: DeadlineCard[] | undefined, tasks: DeadlineTask[] | undefined): DeadlineItem[] {
  const cardItems: DeadlineItem[] = (cards ?? [])
    .filter((card): card is DeadlineCard & { due_date: string } => Boolean(card.due_date))
    .map((card) => ({
      id: `card-${card.id}`,
      kind: 'card',
      title: card.title,
      date: parseISO(card.due_date),
      priority: card.priority,
      targetItemId: card.board_id,
    }))

  const taskItems: DeadlineItem[] = (tasks ?? [])
    .filter((task): task is DeadlineTask & { due_date: string } => Boolean(task.due_date))
    .map((task) => ({
      id: `task-${task.id}`,
      kind: 'task',
      title: task.title,
      date: parseISO(task.due_date),
      priority: task.priority,
      targetItemId: task.task_list_id,
    }))

  return [...cardItems, ...taskItems]
}

export function toDateTimeLocalValue(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm")
}

export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}

export interface ReminderOption {
  value: string
  label: string
  minutes: number | null
}

export function getReminderOptions(): ReminderOption[] {
  return [
    { value: 'none', label: t.calendar.none, minutes: null },
    { value: '10', label: t.calendar.reminder10, minutes: 10 },
    { value: '30', label: t.calendar.reminder30, minutes: 30 },
    { value: '60', label: t.calendar.reminder1h, minutes: 60 },
    { value: '1440', label: t.calendar.reminder1d, minutes: 1440 },
  ]
}

export function reminderMinutesToValue(minutes: number | null): string {
  if (minutes === null) return 'none'
  return String(minutes)
}

export function reminderValueToMinutes(value: string): number | null {
  if (value === 'none') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
