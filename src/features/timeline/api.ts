import { parseISO } from 'date-fns'

import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'
import type { KanbanCardRow, PriorityLevel, TaskRow, WorkspaceItemRow } from '@/types/database'

export type TimelineSourceType = 'card' | 'task'

export interface TimelineEntry {
  id: string
  title: string
  sourceType: TimelineSourceType
  /** The workspace item to navigate to on click — the card's board or the task's task list. */
  targetItemId: string
  start: Date
  end: Date
  priority: PriorityLevel
}

type TimelineCardRow = Pick<KanbanCardRow, 'id' | 'board_id' | 'title' | 'priority' | 'start_date' | 'due_date'>
type TimelineTaskRow = Pick<TaskRow, 'id' | 'task_list_id' | 'title' | 'priority' | 'start_date' | 'due_date' | 'completed'>

/**
 * Scope limitation: this only considers kanban boards / task lists that are
 * DIRECT children of the section whose `childItems` are passed in — it does
 * NOT recurse into nested sub-sections. The timeline is meant as a shallow
 * "what's scheduled directly in this section" view, not a recursive rollup
 * of the whole subtree below it.
 */
export async function fetchTimelineEntries(childItems: WorkspaceItemRow[]): Promise<TimelineEntry[]> {
  const boardIds = childItems.filter((item) => item.type === 'kanban').map((item) => item.id)
  const taskListIds = childItems.filter((item) => item.type === 'task_list').map((item) => item.id)

  const [cards, tasks] = await Promise.all([fetchCardsForBoards(boardIds), fetchTasksForLists(taskListIds)])

  return [...cards.map(cardToEntry), ...tasks.map(taskToEntry)]
}

async function fetchCardsForBoards(boardIds: string[]): Promise<TimelineCardRow[]> {
  if (boardIds.length === 0) return []
  const result = await supabase
    .from('kanban_cards')
    .select('id, board_id, title, priority, start_date, due_date')
    .in('board_id', boardIds)
    .is('archived_at', null)
    .not('due_date', 'is', null)
  return throwIfError(result, 'Не вдалося завантажити картки для таймлайну.')
}

async function fetchTasksForLists(taskListIds: string[]): Promise<TimelineTaskRow[]> {
  if (taskListIds.length === 0) return []
  const result = await supabase
    .from('tasks')
    .select('id, task_list_id, title, priority, start_date, due_date, completed')
    .in('task_list_id', taskListIds)
    .eq('completed', false)
    .not('due_date', 'is', null)
  return throwIfError(result, 'Не вдалося завантажити завдання для таймлайну.')
}

// `due_date` is guaranteed non-null by the `.not('due_date', 'is', null)` filters above.
function cardToEntry(card: TimelineCardRow): TimelineEntry {
  const end = parseISO(card.due_date!)
  const start = card.start_date ? parseISO(card.start_date) : end
  return {
    id: `card-${card.id}`,
    title: card.title,
    sourceType: 'card',
    targetItemId: card.board_id,
    start,
    end,
    priority: card.priority,
  }
}

function taskToEntry(task: TimelineTaskRow): TimelineEntry {
  const end = parseISO(task.due_date!)
  const start = task.start_date ? parseISO(task.start_date) : end
  return {
    id: `task-${task.id}`,
    title: task.title,
    sourceType: 'task',
    targetItemId: task.task_list_id,
    start,
    end,
    priority: task.priority,
  }
}
