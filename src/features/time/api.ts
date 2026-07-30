import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { TimeEntryRow } from '@/types/database'

export interface TimeTarget {
  cardId?: string
  taskId?: string
}

export async function fetchRunningTimer(userId: string): Promise<TimeEntryRow | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .maybeSingle()
  if (error) throw toAppError(error, 'Не вдалося перевірити активний таймер.')
  return data
}

interface StartTimerInput extends TimeTarget {
  workspaceId: string
  userId: string
}

export async function startTimer({ workspaceId, userId, cardId, taskId }: StartTimerInput): Promise<TimeEntryRow> {
  const running = await fetchRunningTimer(userId)

  if (running) {
    const sameTarget = cardId ? running.card_id === cardId : running.task_id === taskId
    if (sameTarget) return running
    await stopTimer(running.id)
  }

  const result = await supabase
    .from('time_entries')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      card_id: cardId ?? null,
      task_id: taskId ?? null,
      ended_at: null,
    })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося запустити таймер.')
}

export async function stopTimer(entryId: string): Promise<TimeEntryRow> {
  const result = await supabase
    .from('time_entries')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', entryId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося зупинити таймер.')
}

export async function fetchEntriesForTarget({ cardId, taskId }: TimeTarget): Promise<TimeEntryRow[]> {
  const base = supabase.from('time_entries').select('*').order('started_at', { ascending: false })
  const result = await (cardId ? base.eq('card_id', cardId) : base.eq('task_id', taskId!))
  return throwIfError(result, 'Не вдалося завантажити записи часу.')
}

export async function fetchTotalSecondsForTarget({ cardId, taskId }: TimeTarget): Promise<number> {
  const base = supabase.from('time_entries').select('started_at, ended_at').not('ended_at', 'is', null)
  const result = await (cardId ? base.eq('card_id', cardId) : base.eq('task_id', taskId!))
  const rows = throwIfError(result, 'Не вдалося порахувати витрачений час.')
  return rows.reduce((total, row) => {
    if (!row.ended_at) return total
    return total + (new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()) / 1000
  }, 0)
}

export async function deleteTimeEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('time_entries').delete().eq('id', entryId)
  if (error) throw toAppError(error, 'Не вдалося видалити запис часу.')
}
