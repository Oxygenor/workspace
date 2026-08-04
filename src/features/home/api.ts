import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'

export type DeadlineSourceType = 'card' | 'task'

export interface DeadlineEntry {
  id: string
  title: string
  due_date: string | null
  sourceType: DeadlineSourceType
  /** Item to navigate to: the kanban board id for cards, the task-list id for tasks. */
  targetItemId: string
  /** Only meaningful for tasks — lets "Мій день" toggle it off without leaving the page. */
  completed?: boolean
}

function sortByDueDate(entries: DeadlineEntry[]): DeadlineEntry[] {
  return [...entries].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export interface MyDayResult {
  overdue: DeadlineEntry[]
  today: DeadlineEntry[]
}

/** "Мій день": everything due today, plus anything overdue that's still outstanding. */
export async function fetchMyDay(): Promise<MyDayResult> {
  const todayStart = startOfToday()
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const nowIso = new Date().toISOString()

  const [cardsResult, tasksResult] = await Promise.all([
    supabase
      .from('kanban_cards')
      .select('id, board_id, title, due_date')
      .is('archived_at', null)
      .not('due_date', 'is', null)
      .lt('due_date', todayEnd.toISOString()),
    supabase
      .from('tasks')
      .select('id, task_list_id, title, due_date, completed')
      .eq('completed', false)
      .not('due_date', 'is', null)
      .lt('due_date', todayEnd.toISOString())
      .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`),
  ])

  const cards = throwIfError(cardsResult, 'Не вдалося завантажити дедлайни карток.')
  const tasks = throwIfError(tasksResult, 'Не вдалося завантажити дедлайни завдань.')

  const cardEntries: DeadlineEntry[] = cards.map((c) => ({
    id: c.id,
    title: c.title,
    due_date: c.due_date,
    sourceType: 'card',
    targetItemId: c.board_id,
  }))
  const taskEntries: DeadlineEntry[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    sourceType: 'task',
    targetItemId: task.task_list_id,
    completed: task.completed,
  }))

  const all = [...cardEntries, ...taskEntries]
  const overdue = all.filter((entry) => new Date(entry.due_date!).getTime() < todayStart.getTime())
  const today = all.filter((entry) => new Date(entry.due_date!).getTime() >= todayStart.getTime())

  return { overdue: sortByDueDate(overdue), today: sortByDueDate(today) }
}

/** Strictly future deadlines (tomorrow onward), for forward planning. */
export async function fetchUpcomingDeadlines(withinDays = 7): Promise<DeadlineEntry[]> {
  const from = new Date(startOfToday().getTime() + 24 * 60 * 60 * 1000)
  const until = new Date(from.getTime() + withinDays * 24 * 60 * 60 * 1000)
  const nowIso = new Date().toISOString()

  const [cardsResult, tasksResult] = await Promise.all([
    supabase
      .from('kanban_cards')
      .select('id, board_id, title, due_date')
      .is('archived_at', null)
      .not('due_date', 'is', null)
      .gte('due_date', from.toISOString())
      .lte('due_date', until.toISOString()),
    supabase
      .from('tasks')
      .select('id, task_list_id, title, due_date')
      .eq('completed', false)
      .not('due_date', 'is', null)
      .gte('due_date', from.toISOString())
      .lte('due_date', until.toISOString())
      .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`),
  ])

  const cards = throwIfError(cardsResult, 'Не вдалося завантажити дедлайни карток.')
  const tasks = throwIfError(tasksResult, 'Не вдалося завантажити дедлайни завдань.')

  const cardEntries: DeadlineEntry[] = cards.map((c) => ({ id: c.id, title: c.title, due_date: c.due_date, sourceType: 'card', targetItemId: c.board_id }))
  const taskEntries: DeadlineEntry[] = tasks.map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, sourceType: 'task', targetItemId: t.task_list_id }))

  return sortByDueDate([...cardEntries, ...taskEntries])
}

export async function toggleTaskCompleted(taskId: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('tasks').update({ completed }).eq('id', taskId)
  if (error) throw toAppError(error, 'Не вдалося оновити завдання.')
}

export interface BoardOverviewCard {
  id: string
  boardId: string
  title: string
  due_date: string | null
}

export interface BoardOverview {
  inProgress: BoardOverviewCard[]
  inbox: BoardOverviewCard[]
  completedToday: number
}

async function fetchCardsForFlaggedColumns(
  columns: { id: string; is_in_progress_column: boolean; is_reset_target_column: boolean }[],
  flag: 'is_in_progress_column' | 'is_reset_target_column',
): Promise<BoardOverviewCard[]> {
  const columnIds = columns.filter((c) => c[flag]).map((c) => c.id)
  if (columnIds.length === 0) return []

  const result = await supabase
    .from('kanban_cards')
    .select('id, board_id, title, due_date')
    .in('column_id', columnIds)
    .is('archived_at', null)
    .order('position', { ascending: true })
  const cards = throwIfError(result, 'Не вдалося завантажити картки дошок.')

  return cards.map((c) => ({ id: c.id, boardId: c.board_id, title: c.title, due_date: c.due_date }))
}

/** Cross-board snapshot: cards sitting in "in progress" / "reset target" columns, plus how many were completed (moved to a done column) today. */
export async function fetchBoardOverview(): Promise<BoardOverview> {
  const columnsResult = await supabase
    .from('kanban_columns')
    .select('id, is_in_progress_column, is_reset_target_column, is_done_column')
    .is('archived_at', null)
    .or('is_in_progress_column.eq.true,is_reset_target_column.eq.true,is_done_column.eq.true')
  const columns = throwIfError(columnsResult, 'Не вдалося завантажити колонки дошок.')

  const doneColumnIds = columns.filter((c) => c.is_done_column).map((c) => c.id)
  const todayStart = startOfToday()

  const [inProgress, inbox, completedToday] = await Promise.all([
    fetchCardsForFlaggedColumns(columns, 'is_in_progress_column'),
    fetchCardsForFlaggedColumns(columns, 'is_reset_target_column'),
    doneColumnIds.length === 0
      ? Promise.resolve(0)
      : supabase
          .from('kanban_cards')
          .select('id', { count: 'exact', head: true })
          .in('column_id', doneColumnIds)
          .is('archived_at', null)
          .gte('column_entered_at', todayStart.toISOString())
          .then((res) => {
            if (res.error) throw toAppError(res.error, 'Не вдалося порахувати завершені картки.')
            return res.count ?? 0
          }),
  ])

  return { inProgress, inbox, completedToday }
}
