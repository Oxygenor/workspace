import { supabase } from '@/lib/supabase/client'
import { throwIfError, toAppError } from '@/lib/supabase/errors'
import type { UserDayOffRow, UserScheduleSettingsRow } from '@/types/database'

/** The `user_schedule_settings` row is auto-created for every user by a DB trigger, so it always exists. */
export async function fetchScheduleSettings(userId: string): Promise<UserScheduleSettingsRow> {
  const result = await supabase.from('user_schedule_settings').select('*').eq('user_id', userId).single()
  return throwIfError(result, 'Не вдалося завантажити робочий графік.')
}

export interface ScheduleSettingsUpdate {
  work_start?: string
  work_end?: string
  break_start?: string | null
  break_end?: string | null
  idle_nudge_enabled?: boolean
}

export async function updateScheduleSettings(
  userId: string,
  update: ScheduleSettingsUpdate,
): Promise<UserScheduleSettingsRow> {
  const result = await supabase
    .from('user_schedule_settings')
    .update(update)
    .eq('user_id', userId)
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося оновити робочий графік.')
}

export async function fetchDaysOff(userId: string): Promise<UserDayOffRow[]> {
  const result = await supabase
    .from('user_days_off')
    .select('*')
    .eq('user_id', userId)
    .order('specific_date', { ascending: true })
  return throwIfError(result, 'Не вдалося завантажити вихідні дні.')
}

export async function setWeekdayOff(userId: string, weekday: number, isOff: boolean): Promise<void> {
  if (isOff) {
    const { error } = await supabase.from('user_days_off').insert({ user_id: userId, weekday, is_working: false })
    if (error) throw toAppError(error, 'Не вдалося позначити вихідний день.')
    return
  }
  const { error } = await supabase.from('user_days_off').delete().eq('user_id', userId).eq('weekday', weekday)
  if (error) throw toAppError(error, 'Не вдалося скасувати вихідний день.')
}

export async function addDateException(
  userId: string,
  specificDate: string,
  isWorking: boolean,
): Promise<UserDayOffRow> {
  const result = await supabase
    .from('user_days_off')
    .upsert({ user_id: userId, specific_date: specificDate, is_working: isWorking }, { onConflict: 'user_id,specific_date' })
    .select('*')
    .single()
  return throwIfError(result, 'Не вдалося додати виняток.')
}

export async function removeDateException(id: string): Promise<void> {
  const { error } = await supabase.from('user_days_off').delete().eq('id', id)
  if (error) throw toAppError(error, 'Не вдалося видалити виняток.')
}
