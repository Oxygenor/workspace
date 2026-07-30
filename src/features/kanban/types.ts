import type { KanbanCardRow } from '@/types/database'

export interface KanbanCardSummary extends KanbanCardRow {
  labelIds: string[]
  tagIds: string[]
  checklistTotal: number
  checklistCompleted: number
  commentsCount: number
  attachmentsCount: number
}

export interface KanbanFilters {
  priority: string | null
  labelId: string | null
  tagId: string | null
  dueFilter: 'overdue' | 'no-due-date' | 'completed' | null
}

export const EMPTY_FILTERS: KanbanFilters = {
  priority: null,
  labelId: null,
  tagId: null,
  dueFilter: null,
}
