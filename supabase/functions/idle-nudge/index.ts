// Supabase Edge Function: idle-nudge
//
// Meant to run every 10 minutes via pg_cron + pg_net (see supabase/functions/README.md).
// For every user who has linked Telegram, checks whether they currently have
// no running card/task timer (`time_entries`), it's been that way for 30+
// minutes during their configured work hours (minus lunch break), it isn't
// a day off, and they haven't already been nudged in the last 30 minutes —
// and if so, sends a Telegram reminder to pick something up.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { sendTelegramMessage } from '../_shared/telegram.ts'
import { compareHm, formatIsoDate, getLocalParts, isDayOff, parseHm, zonedWallTimeToUtcMs } from '../_shared/schedule.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const DEFAULT_TIMEZONE = 'Europe/Kyiv'
const IDLE_THRESHOLD_MS = 30 * 60 * 1000

const NUDGE_MESSAGES = [
  '⏳ Вже 30+ хв без активної картки. Обери задачу і запусти таймер — час не чекає 💪',
  '👀 Помітив простій 30+ хв. Яку картку береш у роботу?',
  '🚀 30 хвилин тиші на дошці. Час обрати картку й натиснути ▶️',
]

function pickMessage(): string {
  return NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)]
}

interface ScheduleSettings {
  work_start: string
  work_end: string
  break_start: string | null
  break_end: string | null
  timezone: string
  idle_nudge_enabled: boolean
  last_idle_nudge_at: string | null
  idle_nudge_paused_until: string | null
  pomodoro_break_until: string | null
}

async function checkUser(userId: string, chatId: string): Promise<'sent' | 'skipped'> {
  const { data: scheduleRow } = await supabase
    .from('user_schedule_settings')
    .select(
      'work_start, work_end, break_start, break_end, timezone, idle_nudge_enabled, last_idle_nudge_at, idle_nudge_paused_until, pomodoro_break_until',
    )
    .eq('user_id', userId)
    .maybeSingle()
  const schedule = scheduleRow as ScheduleSettings | null

  if (!schedule || !schedule.idle_nudge_enabled) return 'skipped'

  if (schedule.idle_nudge_paused_until && new Date(schedule.idle_nudge_paused_until).getTime() > Date.now()) {
    return 'skipped'
  }

  if (schedule.pomodoro_break_until && new Date(schedule.pomodoro_break_until).getTime() > Date.now()) {
    return 'skipped'
  }

  const timezone = schedule.timezone || DEFAULT_TIMEZONE
  const localNow = getLocalParts(new Date(), timezone)
  const isoToday = formatIsoDate(localNow)

  const dayOff = await isDayOff(supabase, userId, isoToday, localNow.weekday)
  if (dayOff) return 'skipped'

  const nowHm = { hour: localNow.hour, minute: localNow.minute }
  const workStart = parseHm(schedule.work_start)
  const workEnd = parseHm(schedule.work_end)
  if (compareHm(nowHm, workStart) < 0 || compareHm(nowHm, workEnd) >= 0) return 'skipped'

  if (schedule.break_start && schedule.break_end) {
    const breakStart = parseHm(schedule.break_start)
    const breakEnd = parseHm(schedule.break_end)
    if (compareHm(nowHm, breakStart) >= 0 && compareHm(nowHm, breakEnd) < 0) return 'skipped'
  }

  const { data: running } = await supabase
    .from('time_entries')
    .select('id')
    .eq('user_id', userId)
    .is('ended_at', null)
    .limit(1)
    .maybeSingle()
  if (running) return 'skipped'

  const { data: lastStoppedRow } = await supabase
    .from('time_entries')
    .select('ended_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastStopped = lastStoppedRow as { ended_at: string } | null

  const workStartMs = zonedWallTimeToUtcMs(localNow.year, localNow.month, localNow.day, workStart.hour, workStart.minute, timezone)

  let idleSinceMs = workStartMs
  if (lastStopped?.ended_at) {
    const stoppedAtMs = new Date(lastStopped.ended_at).getTime()
    const stoppedLocal = getLocalParts(new Date(stoppedAtMs), timezone)
    if (formatIsoDate(stoppedLocal) === isoToday) {
      idleSinceMs = Math.max(idleSinceMs, stoppedAtMs)
    }
  }

  const nowMs = Date.now()
  if (nowMs - idleSinceMs < IDLE_THRESHOLD_MS) return 'skipped'

  if (schedule.last_idle_nudge_at) {
    const sinceLastNudgeMs = nowMs - new Date(schedule.last_idle_nudge_at).getTime()
    if (sinceLastNudgeMs < IDLE_THRESHOLD_MS) return 'skipped'
  }

  const ok = await sendTelegramMessage(chatId, pickMessage())
  if (!ok) return 'skipped'

  await supabase.from('user_schedule_settings').update({ last_idle_nudge_at: new Date().toISOString() }).eq('user_id', userId)
  return 'sent'
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { data: integrations, error } = await supabase
      .from('user_integrations')
      .select('user_id, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)

    if (error) throw error

    let sent = 0
    let skipped = 0

    for (const integration of integrations ?? []) {
      const chatId = integration.telegram_chat_id as string | null
      if (!chatId) {
        skipped += 1
        continue
      }
      const result = await checkUser(integration.user_id as string, chatId)
      if (result === 'sent') sent += 1
      else skipped += 1
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('idle-nudge error', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
