import type { PriorityLevel } from '@/types/database'

export type DeadlineKind = 'card' | 'task'

export interface DeadlineItem {
  id: string
  kind: DeadlineKind
  title: string
  date: Date
  priority: PriorityLevel
  /** id of the parent workspace item to navigate to (board id for cards, task list id for tasks) */
  targetItemId: string
}

export type CalendarViewMode = 'month' | 'week' | 'day'
