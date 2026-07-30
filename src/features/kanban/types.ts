import type { KanbanCardRow } from '@/types/database'

export interface KanbanCardSummary extends KanbanCardRow {
  assigneeIds: string[]
  labelIds: string[]
  checklistTotal: number
  checklistCompleted: number
  commentsCount: number
  attachmentsCount: number
}

export interface KanbanFilters {
  assigneeId: string | null
  priority: string | null
  labelId: string | null
  dueFilter: 'overdue' | 'no-due-date' | 'completed' | null
}

export const EMPTY_FILTERS: KanbanFilters = {
  assigneeId: null,
  priority: null,
  labelId: null,
  dueFilter: null,
}
