// Supabase Edge Function: card-reset
//
// Meant to run every ~10 minutes via pg_cron + pg_net (see supabase/functions/README.md),
// same cadence as idle-nudge. At the first poll at/after each user's configured
// work_start (their timezone, skipping days off), sweeps every card sitting in a
// column flagged `is_in_progress_column` back to that board's `is_reset_target_column`
// — so a card left "in progress" overnight doesn't sit there silently forgotten.
// Runs at most once per local day per user (`last_card_reset_at` guards re-runs on
// later polls the same day). Unlike idle-nudge, this loops over every user with
// schedule settings, not just ones with Telegram linked — the reset itself doesn't
// need Telegram, only the optional summary notification does.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { sendTelegramMessage } from '../_shared/telegram.ts'
import { formatIsoDate, getLocalParts, isDayOff, parseHm, zonedWallTimeToUtcMs } from '../_shared/schedule.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const DEFAULT_TIMEZONE = 'Europe/Kyiv'
// Wide enough to reliably catch the first ~10-minute poll after work_start even if
// a run is briefly delayed, without waiting so long a missed poll goes unnoticed.
const RESET_WINDOW_MS = 20 * 60 * 1000

interface ScheduleRow {
  user_id: string
  work_start: string
  timezone: string
  last_card_reset_at: string | null
}

function pluralCards(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'карток'
  const mod10 = n % 10
  if (mod10 === 1) return 'картку'
  if (mod10 >= 2 && mod10 <= 4) return 'картки'
  return 'карток'
}

async function checkUser(schedule: ScheduleRow): Promise<'reset' | 'skipped'> {
  const timezone = schedule.timezone || DEFAULT_TIMEZONE
  const localNow = getLocalParts(new Date(), timezone)
  const isoToday = formatIsoDate(localNow)

  if (schedule.last_card_reset_at) {
    const lastLocal = getLocalParts(new Date(schedule.last_card_reset_at), timezone)
    if (formatIsoDate(lastLocal) === isoToday) return 'skipped'
  }

  const dayOff = await isDayOff(supabase, schedule.user_id, isoToday, localNow.weekday)
  if (dayOff) return 'skipped'

  const workStart = parseHm(schedule.work_start)
  const workStartMs = zonedWallTimeToUtcMs(
    localNow.year,
    localNow.month,
    localNow.day,
    workStart.hour,
    workStart.minute,
    timezone,
  )
  const nowMs = Date.now()
  if (nowMs < workStartMs || nowMs - workStartMs > RESET_WINDOW_MS) return 'skipped'

  const { data: moved, error } = await supabase.rpc('reset_in_progress_cards', { p_user_id: schedule.user_id })
  if (error) {
    console.error('reset_in_progress_cards failed', schedule.user_id, error)
    return 'skipped'
  }

  await supabase
    .from('user_schedule_settings')
    .update({ last_card_reset_at: new Date().toISOString() })
    .eq('user_id', schedule.user_id)

  const movedCount = (moved as number) ?? 0
  if (movedCount > 0) {
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('telegram_chat_id')
      .eq('user_id', schedule.user_id)
      .maybeSingle()
    const chatId = integration?.telegram_chat_id as string | null
    if (chatId) {
      await sendTelegramMessage(
        chatId,
        `🔄 Повернуто ${movedCount} ${pluralCards(movedCount)} у "Вхідні", бо стояли непочатими зранку.`,
      )
    }
  }

  return 'reset'
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  try {
    const { data: schedules, error } = await supabase
      .from('user_schedule_settings')
      .select('user_id, work_start, timezone, last_card_reset_at')

    if (error) throw error

    let reset = 0
    let skipped = 0

    for (const schedule of (schedules ?? []) as ScheduleRow[]) {
      const result = await checkUser(schedule)
      if (result === 'reset') reset += 1
      else skipped += 1
    }

    return new Response(JSON.stringify({ reset, skipped }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('card-reset error', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
