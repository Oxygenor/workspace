import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import { nextAppendPosition } from '@/lib/position'
import { createCard } from '@/features/kanban/api'
import { createTask } from '@/features/tasks/api'
import type { InboxItemRow } from '@/types/database'

export async function fetchInboxItems(userId: string): Promise<InboxItemRow[]> {
  const result = await supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
  return throwIfError(result, 'Не вдалося завантажити вхідні.')
}

export async function createInboxItem(userId: string, text: string): Promise<InboxItemRow> {
  const result = await supabase.from('inbox_items').insert({ user_id: userId, text }).select('*').single()
  return throwIfError(result, 'Не вдалося зберегти запис.')
}

export async function archiveInboxItem(id: string): Promise<void> {
  const { error } = await supabase.from('inbox_items').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw toAppError(error, 'Не вдалося прибрати запис.')
}

export async function deleteInboxItem(id: string): Promise<void> {
  const { error } = await supabase.from('inbox_items').delete().eq('id', id)
  if (error) throw toAppError(error, 'Не вдалося видалити запис.')
}

/** Converts an inbox item to a kanban card in the board's first (lowest-position) column, then archives the inbox item. */
export async function convertInboxItemToCard(item: InboxItemRow, boardId: string, createdBy: string) {
  const columnsResult = await supabase
    .from('kanban_columns')
    .select('id, position')
    .eq('board_id', boardId)
    .is('archived_at', null)
    .order('position', { ascending: true })
    .limit(1)
  const columns = throwIfError(columnsResult, 'Не вдалося знайти колонку дошки.')
  const firstColumn = columns[0]
  if (!firstColumn) throw new Error('На дошці немає жодної колонки.')

  const cardsResult = await supabase
    .from('kanban_cards')
    .select('position')
    .eq('column_id', firstColumn.id)
    .is('archived_at', null)
    .order('position', { ascending: true })
  const existingCards = throwIfError(cardsResult, 'Не вдалося перевірити картки колонки.')

  const card = await createCard({
    boardId,
    columnId: firstColumn.id,
    title: item.text,
    position: nextAppendPosition(existingCards),
    createdBy,
  })
  await archiveInboxItem(item.id)
  return card
}

/** Converts an inbox item to a task at the end of the chosen task list, then archives the inbox item. */
export async function convertInboxItemToTask(item: InboxItemRow, taskListId: string) {
  const tasksResult = await supabase
    .from('tasks')
    .select('position')
    .eq('task_list_id', taskListId)
    .order('position', { ascending: true })
  const existingTasks = throwIfError(tasksResult, 'Не вдалося перевірити завдання списку.')

  const task = await createTask(taskListId, item.text, nextAppendPosition(existingTasks))
  await archiveInboxItem(item.id)
  return task
}
