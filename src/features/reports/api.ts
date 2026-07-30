import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subDays, subWeeks } from 'date-fns'

import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type { KanbanCardRow, TaskRow, TimeEntryRow, WorkspaceItemRow } from '@/types/database'

export type TimeReportPeriod = 'thisWeek' | 'lastWeek' | 'thisMonth'

export interface PeriodRange {
  start: Date
  end: Date
}

/** Computes a Monday-start `[start, end]` range for a given report period. */
export function getPeriodRange(period: TimeReportPeriod, reference = new Date()): PeriodRange {
  switch (period) {
    case 'thisWeek':
      return { start: startOfWeek(reference, { weekStartsOn: 1 }), end: endOfWeek(reference, { weekStartsOn: 1 }) }
    case 'lastWeek': {
      const lastWeekReference = subWeeks(reference, 1)
      return {
        start: startOfWeek(lastWeekReference, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeekReference, { weekStartsOn: 1 }),
      }
    }
    case 'thisMonth':
      return { start: startOfMonth(reference), end: endOfMonth(reference) }
  }
}

function entryDurationSeconds(entry: Pick<TimeEntryRow, 'started_at' | 'ended_at'>): number {
  if (!entry.ended_at) return 0
  return (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000
}

/** Completed (not currently running) time entries for a user within `[start, end]`. */
export async function fetchCompletedTimeEntries(userId: string, start: Date, end: Date): Promise<TimeEntryRow[]> {
  const result = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', start.toISOString())
    .lte('started_at', end.toISOString())
  return throwIfError(result, 'Не вдалося завантажити записи часу.')
}

export interface ProjectTimeSummary {
  item: WorkspaceItemRow
  totalSeconds: number
}

export interface TimeReportResult {
  totalSeconds: number
  projects: ProjectTimeSummary[]
}

/**
 * Resolves a set of time entries to the "project" they belong to — a card's board,
 * or a task's task list — and sums tracked seconds per project (workspace item),
 * sorted with the most time-consuming project first.
 */
export async function summarizeTimeByProject(entries: TimeEntryRow[]): Promise<TimeReportResult> {
  const totalSeconds = entries.reduce((sum, entry) => sum + entryDurationSeconds(entry), 0)

  const cardIds = [...new Set(entries.map((e) => e.card_id).filter((id): id is string => Boolean(id)))]
  const taskIds = [...new Set(entries.map((e) => e.task_id).filter((id): id is string => Boolean(id)))]

  const [cardsResult, tasksResult] = await Promise.all([
    cardIds.length > 0
      ? supabase.from('kanban_cards').select('id, board_id').in('id', cardIds)
      : Promise.resolve({ data: [] as Pick<KanbanCardRow, 'id' | 'board_id'>[], error: null }),
    taskIds.length > 0
      ? supabase.from('tasks').select('id, task_list_id').in('id', taskIds)
      : Promise.resolve({ data: [] as Pick<TaskRow, 'id' | 'task_list_id'>[], error: null }),
  ])

  const cards = throwIfError(cardsResult, 'Не вдалося завантажити картки.')
  const tasks = throwIfError(tasksResult, 'Не вдалося завантажити завдання.')

  const projectIdByCardId = new Map(cards.map((c) => [c.id, c.board_id]))
  const projectIdByTaskId = new Map(tasks.map((t) => [t.id, t.task_list_id]))

  const secondsByProjectId = new Map<string, number>()
  for (const entry of entries) {
    const seconds = entryDurationSeconds(entry)
    if (seconds <= 0) continue
    const projectId = entry.card_id
      ? projectIdByCardId.get(entry.card_id)
      : entry.task_id
        ? projectIdByTaskId.get(entry.task_id)
        : undefined
    // Card/task may have been deleted after the time entry was recorded — skip those.
    if (!projectId) continue
    secondsByProjectId.set(projectId, (secondsByProjectId.get(projectId) ?? 0) + seconds)
  }

  const projectIds = [...secondsByProjectId.keys()]
  if (projectIds.length === 0) return { totalSeconds, projects: [] }

  const itemsResult = await supabase.from('workspace_items').select('*').in('id', projectIds)
  const items = throwIfError(itemsResult, 'Не вдалося завантажити розділи.')
  const itemById = new Map(items.map((item) => [item.id, item]))

  const projects: ProjectTimeSummary[] = projectIds
    .map((id): ProjectTimeSummary | null => {
      const item = itemById.get(id)
      if (!item) return null
      return { item, totalSeconds: secondsByProjectId.get(id)! }
    })
    .filter((project): project is ProjectTimeSummary => project !== null)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)

  return { totalSeconds, projects }
}

/** Time tracked by project for a user within `[start, end]`. */
export async function fetchTimeReport(userId: string, start: Date, end: Date): Promise<TimeReportResult> {
  const entries = await fetchCompletedTimeEntries(userId, start, end)
  return summarizeTimeByProject(entries)
}

export interface CompletedTaskSummary {
  id: string
  title: string
  task_list_id: string
  updated_at: string
}

/** Tasks marked complete in the last `sinceDays` days. */
export async function fetchCompletedTasksThisWeek(sinceDays = 7): Promise<CompletedTaskSummary[]> {
  const since = subDays(new Date(), sinceDays).toISOString()
  const result = await supabase
    .from('tasks')
    .select('id, title, task_list_id, updated_at')
    .eq('completed', true)
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
  return throwIfError(result, 'Не вдалося завантажити виконані завдання.')
}

export interface ClosedCardSummary {
  id: string
  title: string
  board_id: string
  updated_at: string
}

/**
 * Heuristic for "closed this week": kanban_cards has no explicit "done" flag, so we
 * treat a card that currently sits in its board's last column (highest `position`)
 * and was updated within the last `sinceDays` days as closed.
 */
export async function fetchClosedCardsThisWeek(sinceDays = 7): Promise<ClosedCardSummary[]> {
  const since = subDays(new Date(), sinceDays).toISOString()
  const cardsResult = await supabase
    .from('kanban_cards')
    .select('id, board_id, column_id, title, updated_at')
    .is('archived_at', null)
    .gte('updated_at', since)
  const cards = throwIfError(cardsResult, 'Не вдалося завантажити картки.')
  if (cards.length === 0) return []

  const boardIds = [...new Set(cards.map((c) => c.board_id))]
  const columnsResult = await supabase
    .from('kanban_columns')
    .select('id, board_id, position')
    .in('board_id', boardIds)
    .is('archived_at', null)
  const columns = throwIfError(columnsResult, 'Не вдалося завантажити колонки.')

  const lastColumnByBoard = new Map<string, { columnId: string; position: number }>()
  for (const column of columns) {
    const current = lastColumnByBoard.get(column.board_id)
    if (!current || column.position > current.position) {
      lastColumnByBoard.set(column.board_id, { columnId: column.id, position: column.position })
    }
  }

  return cards
    .filter((card) => lastColumnByBoard.get(card.board_id)?.columnId === card.column_id)
    .map((card) => ({ id: card.id, title: card.title, board_id: card.board_id, updated_at: card.updated_at }))
}
