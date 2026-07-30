import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { CalendarEventRow, KanbanCardRow, PriorityLevel, TaskRow } from '@/types/database'

export interface CalendarEventInput {
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  color: string
  related_card_id: string | null
  related_item_id: string | null
  reminder_minutes_before: number | null
}

export async function fetchEvents(calendarId: string): Promise<CalendarEventRow[]> {
  const result = await supabase
    .from('calendar_events')
    .select('*')
    .eq('calendar_id', calendarId)
    .order('starts_at', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити події.')
}

export async function createEvent(
  calendarId: string,
  input: CalendarEventInput,
  createdBy: string,
): Promise<CalendarEventRow> {
  const result = await supabase
    .from('calendar_events')
    .insert({ calendar_id: calendarId, created_by: createdBy, ...input })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося створити подію.')
}

export async function updateEvent(eventId: string, input: Partial<CalendarEventInput>): Promise<CalendarEventRow> {
  const result = await supabase.from('calendar_events').update(input).eq('id', eventId).select('*').single()
  return throwIfError(result, 'Не вдалося оновити подію.')
}

export async function deleteEvent(eventId: string): Promise<void> {
  const { error } = await supabase.from('calendar_events').delete().eq('id', eventId)
  if (error) throw toAppError(error, 'Не вдалося видалити подію.')
}

export type DeadlineCard = Pick<KanbanCardRow, 'id' | 'board_id' | 'title' | 'due_date' | 'priority'>

export async function fetchDeadlineCards(): Promise<DeadlineCard[]> {
  const result = await supabase
    .from('kanban_cards')
    .select('id, board_id, title, due_date, priority')
    .not('due_date', 'is', null)
    .is('archived_at', null)
  return throwIfError(result, 'Не вдалося завантажити дедлайни карток.')
}

export type DeadlineTask = Pick<TaskRow, 'id' | 'task_list_id' | 'title' | 'due_date' | 'priority'>

export async function fetchDeadlineTasks(): Promise<DeadlineTask[]> {
  const result = await supabase
    .from('tasks')
    .select('id, task_list_id, title, due_date, priority')
    .not('due_date', 'is', null)
    .eq('completed', false)
  return throwIfError(result, 'Не вдалося завантажити дедлайни завдань.')
}

export type { PriorityLevel }
