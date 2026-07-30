import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { PriorityLevel, TaskDependencyRow, TaskRow } from '@/types/database'

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
  is_someday?: boolean
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

export async function bulkUpdateTasks(taskIds: string[], input: UpdateTaskInput): Promise<void> {
  const { error } = await supabase.from('tasks').update(input).in('id', taskIds)
  if (error) throw toAppError(error, 'Не вдалося оновити завдання.')
}

export async function bulkDeleteTasks(taskIds: string[]): Promise<void> {
  const { error } = await supabase.from('tasks').delete().in('id', taskIds)
  if (error) throw toAppError(error, 'Не вдалося видалити завдання.')
}

export async function fetchDependencies(taskListId: string): Promise<TaskDependencyRow[]> {
  const taskIdsResult = await supabase.from('tasks').select('id').eq('task_list_id', taskListId)
  const taskRows = throwIfError(taskIdsResult, 'Не вдалося завантажити залежності завдань.')
  const taskIds = taskRows.map((row: { id: string }) => row.id)
  if (taskIds.length === 0) return []
  const result = await supabase.from('task_dependencies').select('*').in('task_id', taskIds)
  return throwIfError(result, 'Не вдалося завантажити залежності завдань.')
}

export async function addDependency(taskId: string, dependsOnTaskId: string): Promise<TaskDependencyRow> {
  const result = await supabase
    .from('task_dependencies')
    .insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося додати залежність.')
}

export async function removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('task_id', taskId)
    .eq('depends_on_task_id', dependsOnTaskId)
  if (error) throw toAppError(error, 'Не вдалося видалити залежність.')
}

export type { PriorityLevel }
