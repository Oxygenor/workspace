import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { PriorityLevel, TaskRow } from '@/types/database'

export async function fetchTasks(taskListId: string): Promise<TaskRow[]> {
  const result = await supabase
    .from('tasks')
    .select('*')
    .eq('task_list_id', taskListId)
    .order('position', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити завдання.')
}

export async function createTask(
  taskListId: string,
  title: string,
  position: number,
  parentTaskId?: string | null,
): Promise<TaskRow> {
  const result = await supabase
    .from('tasks')
    .insert({ task_list_id: taskListId, title, position, parent_task_id: parentTaskId ?? null })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося створити завдання.')
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  completed?: boolean
  priority?: PriorityLevel
  due_date?: string | null
  assignee_id?: string | null
  labels?: string[]
  position?: number
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<TaskRow> {
  const result = await supabase.from('tasks').update(input).eq('id', taskId).select('*').single()
  return throwIfError(result, 'Не вдалося оновити завдання.')
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw toAppError(error, 'Не вдалося видалити завдання.')
}

export async function reorderTask(taskId: string, position: number): Promise<void> {
  const { error } = await supabase.from('tasks').update({ position }).eq('id', taskId)
  if (error) throw toAppError(error, 'Не вдалося змінити порядок завдань.')
}

export type { PriorityLevel }
