import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'

export type DeadlineSourceType = 'card' | 'task'

export interface DeadlineEntry {
  id: string
  title: string
  due_date: string | null
  sourceType: DeadlineSourceType
  /** Item to navigate to: the kanban board id for cards, the task-list id for tasks. */
  targetItemId: string
}

function sortByDueDate(entries: DeadlineEntry[]): DeadlineEntry[] {
  return [...entries].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  })
}

export async function fetchMyAssignedItems(userId: string): Promise<DeadlineEntry[]> {
  const [assigneeResult, taskResult] = await Promise.all([
    supabase.from('card_assignees').select('card_id').eq('user_id', userId),
    supabase.from('tasks').select('id, task_list_id, title, due_date').eq('assignee_id', userId).eq('completed', false),
  ])
  const assignments = throwIfError(assigneeResult, 'Не вдалося завантажити призначені картки.')
  const assignedTasks = throwIfError(taskResult, 'Не вдалося завантажити призначені завдання.')

  let cardEntries: DeadlineEntry[] = []
  if (assignments.length > 0) {
    const cardIds = assignments.map((a) => a.card_id)
    const cardsResult = await supabase
      .from('kanban_cards')
      .select('id, board_id, title, due_date')
      .in('id', cardIds)
      .is('archived_at', null)
    const cards = throwIfError(cardsResult, 'Не вдалося завантажити призначені картки.')
    cardEntries = cards.map((c) => ({ id: c.id, title: c.title, due_date: c.due_date, sourceType: 'card', targetItemId: c.board_id }))
  }

  const taskEntries: DeadlineEntry[] = assignedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    due_date: task.due_date,
    sourceType: 'task',
    targetItemId: task.task_list_id,
  }))

  return sortByDueDate([...cardEntries, ...taskEntries])
}

export async function fetchUpcomingDeadlines(withinDays = 7): Promise<DeadlineEntry[]> {
  const now = new Date()
  const until = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)

  const [cardsResult, tasksResult] = await Promise.all([
    supabase
      .from('kanban_cards')
      .select('id, board_id, title, due_date')
      .is('archived_at', null)
      .not('due_date', 'is', null)
      .gte('due_date', now.toISOString())
      .lte('due_date', until.toISOString()),
    supabase
      .from('tasks')
      .select('id, task_list_id, title, due_date')
      .eq('completed', false)
      .not('due_date', 'is', null)
      .gte('due_date', now.toISOString())
      .lte('due_date', until.toISOString()),
  ])

  const cards = throwIfError(cardsResult, 'Не вдалося завантажити дедлайни карток.')
  const tasks = throwIfError(tasksResult, 'Не вдалося завантажити дедлайни завдань.')

  const cardEntries: DeadlineEntry[] = cards.map((c) => ({ id: c.id, title: c.title, due_date: c.due_date, sourceType: 'card', targetItemId: c.board_id }))
  const taskEntries: DeadlineEntry[] = tasks.map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, sourceType: 'task', targetItemId: t.task_list_id }))

  return sortByDueDate([...cardEntries, ...taskEntries])
}

export async function fetchOverdueDeadlines(): Promise<DeadlineEntry[]> {
  const now = new Date().toISOString()

  const [cardsResult, tasksResult] = await Promise.all([
    supabase
      .from('kanban_cards')
      .select('id, board_id, title, due_date')
      .is('archived_at', null)
      .not('due_date', 'is', null)
      .lt('due_date', now),
    supabase
      .from('tasks')
      .select('id, task_list_id, title, due_date')
      .eq('completed', false)
      .not('due_date', 'is', null)
      .lt('due_date', now),
  ])

  const cards = throwIfError(cardsResult, 'Не вдалося завантажити прострочені картки.')
  const tasks = throwIfError(tasksResult, 'Не вдалося завантажити прострочені завдання.')

  const cardEntries: DeadlineEntry[] = cards.map((c) => ({ id: c.id, title: c.title, due_date: c.due_date, sourceType: 'card', targetItemId: c.board_id }))
  const taskEntries: DeadlineEntry[] = tasks.map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, sourceType: 'task', targetItemId: t.task_list_id }))

  return sortByDueDate([...cardEntries, ...taskEntries])
}
