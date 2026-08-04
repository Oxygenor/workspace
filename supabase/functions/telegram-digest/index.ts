// Supabase Edge Function: telegram-digest
//
// Meant to run once a day via pg_cron + pg_net (see supabase/functions/README.md).
// For every user who has linked Telegram, sends a "Мій день"-equivalent
// digest: tasks and kanban cards that are overdue or due today.
//
// This runs with the service-role client, which bypasses RLS entirely —
// so unlike the browser's `fetchMyDay()` (src/features/home/api.ts), which
// relies on RLS to scope results to the caller's workspaces, we must
// manually resolve each user's workspace membership before querying tasks
// and cards, or we'd leak every workspace's data to every user's digest.
//
// Design choice: if a user has nothing overdue or due today, we skip
// sending them a message entirely (rather than sending an empty "nothing
// planned today" notification) to avoid daily notification spam for an
// otherwise-idle account. Both `sent` and `skipped` counts are returned so
// this is observable when triggered manually or inspected via cron logs.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { sendTelegramMessage } from '../_shared/telegram.ts'
import { formatIsoDate, getLocalParts, isDayOff } from '../_shared/schedule.ts'
import { buildDigestForUser, formatDigestMessage } from '../_shared/digest.ts'
import type { DigestMode } from '../_shared/digest.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const DEFAULT_TIMEZONE = 'Europe/Kyiv'

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  let mode: DigestMode = 'ondemand'
  try {
    const body = await req.json()
    if (body?.mode === 'morning' || body?.mode === 'evening') mode = body.mode
  } catch {
    // No body / not JSON — fall back to the neutral header (e.g. manual curl test).
  }

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
      const userId = integration.user_id as string
      if (!chatId) {
        skipped += 1
        continue
      }

      const { data: schedule } = await supabase
        .from('user_schedule_settings')
        .select('timezone')
        .eq('user_id', userId)
        .maybeSingle()
      const timezone = (schedule?.timezone as string | undefined) ?? DEFAULT_TIMEZONE

      const localNow = getLocalParts(new Date(), timezone)
      const dayOff = await isDayOff(supabase, userId, formatIsoDate(localNow), localNow.weekday)
      if (dayOff) {
        skipped += 1
        continue
      }

      const { overdue, today } = await buildDigestForUser(supabase, userId)
      const message = formatDigestMessage(overdue, today, mode)

      if (!message) {
        skipped += 1
        continue
      }

      const ok = await sendTelegramMessage(chatId, message)
      if (ok) sent += 1
      else skipped += 1
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('telegram-digest error', error)
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
