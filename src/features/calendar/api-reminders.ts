import { supabase } from '@/lib/supabase/client'
import { throwIfError } from '@/lib/supabase/errors'

export interface ReminderCandidate {
  id: string
  calendar_id: string
  title: string
  starts_at: string
  reminder_minutes_before: number
}

/** Events with a reminder configured, starting within the next 2 days — a bounded window refreshed periodically. */
export async function fetchReminderCandidates(): Promise<ReminderCandidate[]> {
  const now = new Date()
  const until = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

  const result = await supabase
    .from('calendar_events')
    .select('id, calendar_id, title, starts_at, reminder_minutes_before')
    .not('reminder_minutes_before', 'is', null)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', until.toISOString())

  return throwIfError<ReminderCandidate[]>(result, 'Не вдалося перевірити нагадування.')
}
